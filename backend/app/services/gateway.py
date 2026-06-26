from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from ipaddress import ip_interface, ip_network
import secrets
import shlex
import textwrap
from typing import Any

from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.adapters.system import CommandExecutionResult, FileWriteResult, SystemCommandExecutor
from app.core.config import settings
from app.core.security import verify_password
from app.models.audit import AuditLog
from app.models.auth import User
from app.models.firewall import FirewallNatRule, FirewallPortForward, FirewallRule, FirewallZone
from app.models.gateway import GatewayApplyJob
from app.models.hotspot import HotspotPortal, RadiusAuthAttempt, RadiusNasDevice, RadiusProfile
from app.models.network import DhcpScope, DnsSetting, DynamicDnsProfile, NetworkInterface
from app.models.sessions import HotspotSession
from app.models.vouchers import AccessPlan, Voucher


@dataclass(slots=True)
class RenderedConfig:
    path: str
    content: str
    description: str


@dataclass(slots=True)
class CommandStep:
    command: str
    description: str


@dataclass(slots=True)
class GatewayApplyOutcome:
    job: GatewayApplyJob
    rendered_configs: list[RenderedConfig]
    commands: list[CommandStep]
    executed: bool
    file_writes: list[FileWriteResult] = field(default_factory=list)
    command_results: list[CommandExecutionResult] = field(default_factory=list)
    status: str = "previewed"
    error_message: str | None = None


class GatewayService:
    def __init__(self, db: Session):
        self.db = db
        self.executor = SystemCommandExecutor()

    @staticmethod
    def _parse_database_url(database_url: str) -> dict[str, str]:
        url = make_url(database_url)
        return {
            "username": url.username or "",
            "password": url.password or "",
            "host": url.host or "127.0.0.1",
            "port": str(url.port or 3306),
            "database": url.database or "radius",
        }

    @staticmethod
    def _pick_lan_interface() -> str:
        return "lan0"

    @staticmethod
    def _pick_wan_interface() -> str:
        return "wan0"

    def _get_default_portal(self) -> HotspotPortal | None:
        return self.db.query(HotspotPortal).filter(HotspotPortal.is_active.is_(True)).order_by(HotspotPortal.id.asc()).first()

    def _get_default_radius_profile(self) -> RadiusProfile | None:
        return self.db.query(RadiusProfile).filter(RadiusProfile.is_default.is_(True)).first()

    def _resolve_radius_database_url(self) -> str:
        return settings.radius_database_url or settings.database_url

    @staticmethod
    def _nft_quote(value: str) -> str:
        return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'

    @staticmethod
    def _nft_set(values: list[str]) -> str:
        quoted = [GatewayService._nft_quote(value) for value in values if value]
        if not quoted:
            return ""
        if len(quoted) == 1:
            return quoted[0]
        return "{ " + ", ".join(quoted) + " }"

    @staticmethod
    def _rule_value(value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned or cleaned.lower() in {"any", "none", "required", "disable", "disabled"}:
            return None
        return cleaned

    @staticmethod
    def _address_match(field: str, value: str | None, negate: bool = False) -> str | None:
        cleaned = GatewayService._rule_value(value)
        if not cleaned:
            return None
        operator = "!=" if negate else ""
        try:
            network = ip_network(cleaned, strict=False)
            return f"{field} {operator} {network.with_prefixlen}".replace("  ", " ")
        except ValueError:
            return f"{field} {operator} {cleaned}".replace("  ", " ")

    @staticmethod
    def _ports_match(protocol: str | None, ports: str | None) -> str | None:
        proto = (GatewayService._rule_value(protocol) or "").lower()
        port_value = GatewayService._rule_value(ports)
        if proto not in {"tcp", "udp"} or not port_value:
            return None
        normalized = ", ".join(part.strip() for part in port_value.replace(";", ",").split(",") if part.strip())
        if not normalized:
            return None
        if "," in normalized:
            return f"{proto} dport {{ {normalized} }}"
        return f"{proto} dport {normalized}"

    @staticmethod
    def _protocol_match(protocol: str | None) -> str | None:
        proto = (GatewayService._rule_value(protocol) or "").lower()
        if proto in {"tcp", "udp", "icmp", "gre"}:
            return f"meta l4proto {proto}"
        return None

    def _zone_interfaces(self, zone: FirewallZone | None, interfaces_by_role: dict[str, list[str]]) -> list[str]:
        if not zone:
            return []
        configured = [item for item in (zone.interfaces or []) if item]
        if configured:
            return configured
        zone_name = zone.name.lower()
        if zone_name in interfaces_by_role:
            return interfaces_by_role[zone_name]
        if zone_name in {"guest", "iot", "staff"}:
            return interfaces_by_role.get("lan", [])
        return []

    def _zone_interfaces_by_name(self, zone_name: str | None, zones_by_name: dict[str, FirewallZone], interfaces_by_role: dict[str, list[str]]) -> list[str]:
        cleaned = self._rule_value(zone_name)
        if not cleaned:
            return []
        normalized = cleaned.lower()
        if normalized in interfaces_by_role:
            return interfaces_by_role[normalized]
        return self._zone_interfaces(zones_by_name.get(normalized), interfaces_by_role)

    def render_freeradius_config(self) -> RenderedConfig:
        radius_url = self._parse_database_url(self._resolve_radius_database_url())
        profile_rows = (
            self.db.query(RadiusProfile, AccessPlan)
            .join(AccessPlan, AccessPlan.id == RadiusProfile.access_plan_id)
            .order_by(RadiusProfile.id.asc())
            .all()
        )
        nas_devices = self.db.query(RadiusNasDevice).order_by(RadiusNasDevice.id.asc()).all()
        default_profile = self._get_default_radius_profile()

        group_lines: list[str] = []
        reply_lines: list[str] = []
        for profile, plan in profile_rows:
            group_lines.append(
                f"INSERT INTO radgroupcheck (groupname, attribute, op, value) VALUES ('{profile.radius_group_name}', 'Simultaneous-Use', ':=', '{plan.concurrent_sessions}');"
            )
            if plan.max_duration_minutes:
                reply_lines.append(
                    f"INSERT INTO radgroupreply (groupname, attribute, op, value) VALUES ('{profile.radius_group_name}', 'Session-Timeout', ':=', '{plan.max_duration_minutes * 60}');"
                )
            if plan.idle_timeout_minutes:
                reply_lines.append(
                    f"INSERT INTO radgroupreply (groupname, attribute, op, value) VALUES ('{profile.radius_group_name}', 'Idle-Timeout', ':=', '{plan.idle_timeout_minutes * 60}');"
                )
            reply_lines.append(
                f"INSERT INTO radgroupreply (groupname, attribute, op, value) VALUES ('{profile.radius_group_name}', 'Mikrotik-Rate-Limit', ':=', '{plan.download_kbps}k/{plan.upload_kbps}k');"
            )

        nas_lines = [
            f"INSERT INTO nas (nasname, shortname, secret, server) VALUES ('{nas.ip_address}', '{nas.short_name or nas.name}', '{nas.secret}', '{nas.name}');"
            for nas in nas_devices
        ]

        content = textwrap.dedent(
            f"""
            # Auto-generated by TINNICORE
            # FreeRADIUS SQL profile for MySQL
            sql {{
                dialect = "mysql"
                driver = "rlm_sql_mysql"
                server = "{radius_url['host']}"
                port = {radius_url['port']}
                login = "{radius_url['username']}"
                password = "{radius_url['password']}"
                radius_db = "{radius_url['database']}"
            }}

            # Default profile: {default_profile.profile_name if default_profile else "none"}

            # NAS devices
            {textwrap.indent(chr(10).join(nas_lines) if nas_lines else "# no NAS devices configured", "            ")}

            # Group check rows
            {textwrap.indent(chr(10).join(group_lines) if group_lines else "# no radius profiles configured", "            ")}

            # Group reply rows
            {textwrap.indent(chr(10).join(reply_lines) if reply_lines else "# no radius reply rules configured", "            ")}
            """
        ).strip()

        return RenderedConfig(
            path=f"{settings.gateway_config_dir}/freeradius/mysql.conf",
            content=content,
            description="FreeRADIUS SQL configuration and seed statements",
        )

    def render_chilli_config(self) -> RenderedConfig:
        portal = self._get_default_portal()
        lan_device = (
            self.db.query(NetworkInterface)
            .filter(NetworkInterface.kind.in_(["bridge", "lan"]))
            .order_by(NetworkInterface.id.asc())
            .first()
            or self.db.query(NetworkInterface).filter(NetworkInterface.name.like("lan%")).order_by(NetworkInterface.id.asc()).first()
            or self.db.query(NetworkInterface).order_by(NetworkInterface.id.asc()).first()
        )
        wan_device = (
            self.db.query(NetworkInterface)
            .filter(NetworkInterface.kind.in_(["ethernet", "wan"]))
            .order_by(NetworkInterface.id.asc())
            .first()
            or self.db.query(NetworkInterface).filter(NetworkInterface.name.like("wan%")).order_by(NetworkInterface.id.asc()).first()
        )
        lan_interface = lan_device.name if lan_device else self._pick_lan_interface()
        wan_interface = wan_device.name if wan_device else self._pick_wan_interface()
        lan_network = None
        lan_ip = None
        if lan_device and lan_device.address and lan_device.netmask and lan_device.address.lower() not in {"dhcp", "dynamic"}:
            try:
                lan_network = ip_interface(f"{lan_device.address}/{lan_device.netmask}").network
                lan_ip = str(ip_interface(f"{lan_device.address}/{lan_device.netmask}").ip)
            except ValueError:
                lan_network = None
                lan_ip = None
        if lan_network is None:
            lan_network = ip_network("192.168.10.0/24", strict=False)
            lan_ip = "192.168.10.1"

        portal_url = f"{settings.portal_base_url.rstrip('/')}{portal.landing_path if portal else '/login'}"
        allowed_hosts = ["127.0.0.1", "localhost"]
        if portal and portal.allowed_hosts:
            allowed_hosts.extend(portal.allowed_hosts)
        if portal:
            allowed_hosts.append(portal.portal_host)

        content = textwrap.dedent(
            f"""
            # Auto-generated by TINNICORE
            HS_LANIF={lan_interface}
            HS_WANIF={wan_interface}
            HS_LANIP={lan_ip}
            HS_NETWORK={lan_network.network_address}
            HS_NETMASK={lan_network.netmask}
            HS_UAMSERVER={portal_url}
            HS_UAMFORMAT=https://portal.example.local/login
            HS_UAMHOMEPAGE={settings.portal_base_url.rstrip('/')}/
            HS_UAMSECRET={settings.secret_key}
            HS_DNS1=1.1.1.1
            HS_DNS2=8.8.8.8
            radiusserver1=127.0.0.1
            radiussecret={settings.secret_key}
            uamallowed={','.join(sorted(set(allowed_hosts)))}
            """
        ).strip()

        return RenderedConfig(
            path=f"{settings.gateway_config_dir}/chilli/advgate.conf",
            content=content,
            description="CoovaChilli captive portal configuration",
        )

    def render_dnsmasq_config(self) -> RenderedConfig:
        scopes = self.db.query(DhcpScope).order_by(DhcpScope.id.asc()).all()
        dns_settings = self.db.query(DnsSetting).order_by(DnsSetting.id.asc()).all()
        interfaces = {item.id: item for item in self.db.query(NetworkInterface).order_by(NetworkInterface.id.asc()).all()}

        lines: list[str] = [
            "# Auto-generated by TINNICORE",
            "bind-interfaces",
            "bogus-priv",
            "domain-needed",
        ]

        enabled_dns = [item for item in dns_settings if item.enabled]
        if enabled_dns:
            lines.append("no-resolv")
            for dns in enabled_dns:
                lines.append(f"# resolver {dns.resolver_name}")
                lines.append(f"server={dns.primary_dns}")
                if dns.secondary_dns:
                    lines.append(f"server={dns.secondary_dns}")
                if dns.search_domain:
                    lines.append(f"domain={dns.search_domain}")
                    lines.append(f"local=/{dns.search_domain}/")
                lines.append(f"cache-size={dns.cache_size}")
                lines.append(f"local-ttl={dns.local_ttl}")

        for scope in scopes:
            interface = interfaces.get(scope.interface_id)
            if not scope.enabled or not interface:
                continue
            tag = f"scope{scope.id}"
            netmask = scope.subnet_mask or interface.netmask or "255.255.255.0"
            lease = f"{scope.lease_minutes}m"
            lines.extend(
                [
                    "",
                    f"# DHCP scope: {scope.scope_name}",
                    f"interface={interface.name}",
                    f"dhcp-range=set:{tag},{scope.start_ip},{scope.end_ip},{netmask},{lease}",
                ]
            )
            gateway = scope.gateway or interface.address
            if gateway:
                lines.append(f"dhcp-option=tag:{tag},option:router,{gateway}")
            dns_servers = [item for item in [scope.dns_primary, scope.dns_secondary] if item]
            if dns_servers:
                lines.append(f"dhcp-option=tag:{tag},option:dns-server,{','.join(dns_servers)}")
            elif enabled_dns:
                fallback_dns = [enabled_dns[0].primary_dns, enabled_dns[0].secondary_dns]
                lines.append(f"dhcp-option=tag:{tag},option:dns-server,{','.join(item for item in fallback_dns if item)}")
            domain_name = scope.domain_name or (enabled_dns[0].search_domain if enabled_dns else None)
            if domain_name:
                lines.append(f"dhcp-option=tag:{tag},option:domain-name,{domain_name}")
            for key, value in (scope.options or {}).items():
                if value not in {None, ""}:
                    lines.append(f"dhcp-option=tag:{tag},{key},{value}")

        return RenderedConfig(
            path=f"{settings.gateway_config_dir}/dnsmasq/tinnicore.conf",
            content="\n".join(lines).strip() + "\n",
            description="dnsmasq DHCP and DNS configuration",
        )

    def render_ddclient_config(self) -> RenderedConfig:
        profiles = self.db.query(DynamicDnsProfile).order_by(DynamicDnsProfile.id.asc()).all()
        enabled_intervals = [profile.update_interval_minutes for profile in profiles if profile.enabled and profile.status == "active"]
        daemon_seconds = max(60, min(enabled_intervals or [5]) * 60)
        lines: list[str] = [
            "# Auto-generated by TINNICORE",
            f"daemon={daemon_seconds}",
            "syslog=yes",
            "pid=/run/ddclient.pid",
            "ssl=yes",
            "",
        ]

        for profile in profiles:
            if not profile.enabled or profile.status != "active":
                lines.append(f"# disabled DynDNS profile: {profile.profile_name}")
                continue
            lines.append(f"# DynDNS profile: {profile.profile_name}")
            if profile.check_url:
                lines.append(f"use=web, web={profile.check_url}")
            elif profile.interface_name:
                lines.append(f"use=if, if={profile.interface_name}")
            else:
                lines.append("use=web")
            lines.append(f"protocol={profile.protocol}")
            if profile.server:
                lines.append(f"server={profile.server}")
            lines.append(f"ssl={'yes' if profile.use_ssl else 'no'}")
            lines.append(f"login={profile.username}")
            lines.append(f"password={profile.password}")
            if profile.force_update_days:
                lines.append(f"force={profile.force_update_days}d")
            lines.append(profile.hostnames)
            lines.append("")

        if not profiles:
            lines.append("# no DynDNS profiles configured")

        return RenderedConfig(
            path=f"{settings.gateway_config_dir}/ddclient/ddclient.conf",
            content="\n".join(lines).strip() + "\n",
            description="ddclient dynamic DNS configuration",
        )

    def render_firewall_config(self) -> RenderedConfig:
        zones = self.db.query(FirewallZone).order_by(FirewallZone.id.asc()).all()
        rules = self.db.query(FirewallRule).order_by(FirewallRule.id.asc()).all()
        nat_rules = self.db.query(FirewallNatRule).order_by(FirewallNatRule.id.asc()).all()
        forwards = self.db.query(FirewallPortForward).order_by(FirewallPortForward.id.asc()).all()
        interfaces = self.db.query(NetworkInterface).order_by(NetworkInterface.id.asc()).all()

        zones_by_id = {zone.id: zone for zone in zones}
        zones_by_name = {zone.name.lower(): zone for zone in zones}
        interfaces_by_role: dict[str, list[str]] = {"wan": [], "lan": [], "unassigned": []}
        wan_nat_interfaces: list[str] = []
        for item in interfaces:
            interfaces_by_role.setdefault(item.role, []).append(item.name)
            settings_data = item.settings or {}
            if item.role == "wan" and settings_data.get("nat", "enable") != "disable":
                wan_nat_interfaces.append(item.name)

        zone_comments: list[str] = []
        for zone in zones:
            zone_interfaces = self._zone_interfaces(zone, interfaces_by_role)
            zone_comments.append(f"# zone {zone.name}: policy={zone.policy}; interfaces={', '.join(zone_interfaces) or 'none'}")

        rule_lines: list[str] = []
        for rule in rules:
            if not rule.enabled:
                continue
            source_zone = zones_by_id.get(rule.zone_id)
            destination_zone = zones_by_id.get(rule.destination_zone_id) if rule.destination_zone_id else None
            source_interfaces = [self._rule_value(rule.source_interface)] if self._rule_value(rule.source_interface) else self._zone_interfaces(source_zone, interfaces_by_role)
            destination_interfaces = (
                [self._rule_value(rule.destination_interface)]
                if self._rule_value(rule.destination_interface)
                else self._zone_interfaces(destination_zone, interfaces_by_role)
            )
            action = rule.action.lower() if rule.action.lower() in {"accept", "drop", "reject"} else "drop"
            parts = [
                f"iifname {self._nft_set(source_interfaces)}" if source_interfaces else None,
                f"oifname {self._nft_set(destination_interfaces)}" if destination_interfaces else None,
                self._address_match("ip saddr", rule.source),
                self._address_match("ip saddr", rule.exclude_source, negate=True),
                f"ether saddr {self._rule_value(rule.source_mac)}" if self._rule_value(rule.source_mac) else None,
                f"ether saddr != {self._rule_value(rule.exclude_source_mac)}" if self._rule_value(rule.exclude_source_mac) else None,
                self._address_match("ip daddr", rule.destination),
                self._address_match("ip daddr", rule.exclude_destination, negate=True),
                self._ports_match(rule.protocol, rule.port) or self._protocol_match(rule.protocol),
                f"log prefix {self._nft_quote('TINNICORE ' + rule.rule_name + ' ')}" if rule.log else None,
                action,
                f"comment {self._nft_quote(rule.rule_name)}",
            ]
            rule_lines.append(" ".join(part for part in parts if part))

        postrouting_lines: list[str] = []
        if wan_nat_interfaces:
            postrouting_lines.append(f"oifname {self._nft_set(wan_nat_interfaces)} masquerade comment \"TINNICORE WAN masquerade\"")
        for nat in nat_rules:
            if not nat.enabled:
                continue
            source_match = self._address_match("ip saddr", nat.source)
            if nat.translated_to.lower() == "masquerade":
                postrouting_lines.append(" ".join(part for part in [source_match, "masquerade", f"comment {self._nft_quote(nat.name)}"] if part))
            else:
                postrouting_lines.append(" ".join(part for part in [source_match, f"snat to {nat.translated_to}", f"comment {self._nft_quote(nat.name)}"] if part))

        prerouting_lines: list[str] = []
        hairpin_lines: list[str] = []
        for forward in forwards:
            if not forward.enabled:
                continue
            protocol = forward.protocol.lower() if forward.protocol.lower() in {"tcp", "udp"} else "tcp"
            incoming_interfaces = self._zone_interfaces_by_name(forward.incoming_zone, zones_by_name, interfaces_by_role)
            if self._rule_value(forward.source_interface):
                incoming_interfaces = [self._rule_value(forward.source_interface)]  # type: ignore[list-item]
            target = forward.internal_ip
            if forward.forward_port_mode != "original_port" and self._rule_value(forward.internal_port):
                target = f"{target}:{forward.internal_port}"
            elif forward.forward_port_mode == "original_port" and self._rule_value(forward.internal_port) and forward.internal_port != forward.external_port:
                target = f"{target}:{forward.internal_port}"
            parts = [
                f"iifname {self._nft_set(incoming_interfaces)}" if incoming_interfaces else None,
                self._address_match("ip saddr", forward.source_address),
                self._address_match("ip saddr", forward.exclude_source_address, negate=True),
                self._address_match("ip daddr", forward.original_destination),
                self._address_match("ip daddr", forward.exclude_original_destination, negate=True),
                f"{protocol} sport {forward.source_ports}" if self._rule_value(forward.source_ports) else None,
                f"{protocol} dport {forward.external_port}",
                f"log prefix {self._nft_quote('TINNICORE PF ' + forward.name + ' ')}" if forward.log else None,
                f"dnat to {target}",
                f"comment {self._nft_quote(forward.name)}",
            ]
            prerouting_lines.append(" ".join(part for part in parts if part))
            hairpin_interface = self._rule_value(forward.hairpin_snat_interface)
            if hairpin_interface:
                hairpin_lines.append(
                    f"oifname {self._nft_quote(hairpin_interface)} ip daddr {forward.internal_ip} masquerade comment {self._nft_quote(forward.name + ' hairpin')}"
                )

        content = textwrap.dedent(
            f"""
            # Auto-generated by TINNICORE
            # This file owns only the TINNICORE nftables tables. It does not flush the host ruleset.

            table inet tinnicore {{
              {textwrap.indent(chr(10).join(zone_comments) if zone_comments else '# no zones configured', '  ')}

              chain input {{
                type filter hook input priority filter; policy accept;
                ct state established,related accept
              }}

              chain forward {{
                type filter hook forward priority filter; policy accept;
                ct state established,related accept
                {textwrap.indent(chr(10).join(rule_lines) if rule_lines else '# no enabled filter rules configured', '    ')}
              }}

              chain output {{
                type filter hook output priority filter; policy accept;
              }}
            }}

            table ip tinnicore_nat {{
              chain prerouting {{
                type nat hook prerouting priority dstnat; policy accept;
                {textwrap.indent(chr(10).join(prerouting_lines) if prerouting_lines else '# no port forwards configured', '    ')}
              }}

              chain postrouting {{
                type nat hook postrouting priority srcnat; policy accept;
                {textwrap.indent(chr(10).join([*postrouting_lines, *hairpin_lines]) if [*postrouting_lines, *hairpin_lines] else '# no NAT rules configured', '    ')}
              }}
            }}
            """
        ).strip()

        return RenderedConfig(
            path=f"{settings.gateway_config_dir}/firewall/advgate.nft",
            content=content,
            description="nftables policy for TINNICORE firewall, NAT, and port forwards",
        )

    def build_apply_plan(self, component: str, requested_by_user_id: int | None, dry_run: bool = True, execute: bool = False) -> GatewayApplyOutcome:
        rendered: list[RenderedConfig] = []
        commands: list[CommandStep] = []
        file_writes: list[FileWriteResult] = []
        command_results: list[CommandExecutionResult] = []
        status = "previewed"
        error_message: str | None = None
        execute_now = execute and settings.gateway_execute_commands and not dry_run
        firewall_config_path = f"{settings.gateway_config_dir}/firewall/advgate.nft"
        dnsmasq_config_path = f"{settings.gateway_config_dir}/dnsmasq/tinnicore.conf"
        ddclient_config_path = f"{settings.gateway_config_dir}/ddclient/ddclient.conf"
        firewall_reload_command = (
            "sh -c "
            + shlex.quote(
                "sudo -n /usr/sbin/nft list table inet tinnicore >/dev/null 2>&1 && sudo -n /usr/sbin/nft delete table inet tinnicore || true; "
                "sudo -n /usr/sbin/nft list table ip tinnicore_nat >/dev/null 2>&1 && sudo -n /usr/sbin/nft delete table ip tinnicore_nat || true; "
                f"sudo -n /usr/sbin/nft -f {shlex.quote(firewall_config_path)}; "
                "command -v firewall-cmd >/dev/null 2>&1 && sudo -n /usr/bin/firewall-cmd --reload || true"
            )
        )
        dnsmasq_reload_command = (
            "sh -c "
            + shlex.quote(
                f"if [ -d /etc/dnsmasq.d ]; then sudo -n install -m 0644 {shlex.quote(dnsmasq_config_path)} /etc/dnsmasq.d/tinnicore.conf; fi; "
                "if command -v systemctl >/dev/null 2>&1; then sudo -n systemctl restart dnsmasq; else sudo -n service dnsmasq restart; fi"
            )
        )
        ddclient_reload_command = (
            "sh -c "
            + shlex.quote(
                f"sudo -n install -m 0600 {shlex.quote(ddclient_config_path)} /etc/ddclient.conf; "
                "if command -v systemctl >/dev/null 2>&1; then sudo -n systemctl restart ddclient; else sudo -n service ddclient restart; fi"
            )
        )

        if component == "radius":
            rendered.append(self.render_freeradius_config())
            commands.extend(
                [
                    CommandStep(command=f"install -d {settings.gateway_config_dir}/freeradius", description="Ensure FreeRADIUS config directory exists"),
                    CommandStep(command="systemctl restart freeradius", description="Reload FreeRADIUS after config update"),
                ]
            )
        elif component == "hotspot":
            rendered.append(self.render_chilli_config())
            commands.extend(
                [
                    CommandStep(command=f"install -d {settings.gateway_config_dir}/chilli", description="Ensure CoovaChilli config directory exists"),
                    CommandStep(command="systemctl restart chilli", description="Reload CoovaChilli after config update"),
                ]
            )
        elif component == "firewall":
            rendered.append(self.render_firewall_config())
            commands.extend(
                [
                    CommandStep(command=f"install -d {settings.gateway_config_dir}/firewall", description="Ensure firewall config directory exists"),
                    CommandStep(command=firewall_reload_command, description="Load TINNICORE nftables policy and refresh firewalld if present"),
                ]
            )
        elif component == "network":
            rendered.append(self.render_dnsmasq_config())
            commands.extend(
                [
                    CommandStep(command=f"install -d {settings.gateway_config_dir}/dnsmasq", description="Ensure dnsmasq config directory exists"),
                    CommandStep(command=dnsmasq_reload_command, description="Install dnsmasq config and restart DHCP/DNS service"),
                ]
            )
        elif component == "dyndns":
            rendered.append(self.render_ddclient_config())
            commands.extend(
                [
                    CommandStep(command=f"install -d {settings.gateway_config_dir}/ddclient", description="Ensure ddclient config directory exists"),
                    CommandStep(command=ddclient_reload_command, description="Install ddclient config and restart DynDNS service"),
                ]
            )
        elif component == "all":
            rendered.extend([self.render_freeradius_config(), self.render_chilli_config(), self.render_firewall_config(), self.render_dnsmasq_config(), self.render_ddclient_config()])
            commands.extend(
                [
                    CommandStep(command=f"install -d {settings.gateway_config_dir}/freeradius", description="Ensure FreeRADIUS config directory exists"),
                    CommandStep(command="systemctl restart freeradius", description="Reload FreeRADIUS after config update"),
                    CommandStep(command=f"install -d {settings.gateway_config_dir}/chilli", description="Ensure CoovaChilli config directory exists"),
                    CommandStep(command="systemctl restart chilli", description="Reload CoovaChilli after config update"),
                    CommandStep(command=f"install -d {settings.gateway_config_dir}/firewall", description="Ensure firewall config directory exists"),
                    CommandStep(command=firewall_reload_command, description="Load TINNICORE nftables policy and refresh firewalld if present"),
                    CommandStep(command=f"install -d {settings.gateway_config_dir}/dnsmasq", description="Ensure dnsmasq config directory exists"),
                    CommandStep(command=dnsmasq_reload_command, description="Install dnsmasq config and restart DHCP/DNS service"),
                    CommandStep(command=f"install -d {settings.gateway_config_dir}/ddclient", description="Ensure ddclient config directory exists"),
                    CommandStep(command=ddclient_reload_command, description="Install ddclient config and restart DynDNS service"),
                ]
            )
        else:
            raise ValueError(f"Unsupported component: {component}")

        if execute and not settings.gateway_execute_commands:
            status = "queued"
            error_message = "Execution is disabled by server policy"
        elif execute_now:
            try:
                for rendered_config in rendered:
                    file_writes.append(self.executor.write_text_atomic(rendered_config.path, rendered_config.content))
                for command in commands:
                    result = self.executor.run_command(command.command, timeout_seconds=settings.gateway_command_timeout_seconds)
                    command_results.append(result)
                    if result.returncode != 0:
                        status = "failed"
                        error_message = f"Command failed: {command.command}"
                        break
                else:
                    status = "applied"
            except OSError as exc:
                status = "failed"
                error_message = str(exc)

        job = GatewayApplyJob(
            component=component,
            status=status,
            dry_run=dry_run,
            requested_by_user_id=requested_by_user_id,
            rendered_configs={
                item.path: {"description": item.description, "content": item.content}
                for item in rendered
            },
            command_plan=[{"command": step.command, "description": step.description} for step in commands],
        )
        self.db.add(job)
        self.db.flush()

        self.db.add(
            AuditLog(
                actor=str(requested_by_user_id) if requested_by_user_id is not None else "system",
                action=f"gateway.{component}.apply",
                resource_type="gateway_apply_job",
                resource_id=str(job.id),
                metadata_={
                    "dry_run": dry_run,
                    "execute": execute,
                    "status": status,
                    "commands": [step.command for step in commands],
                    "rendered_paths": [item.path for item in rendered],
                    "file_writes": [{"path": item.path, "bytes_written": item.bytes_written} for item in file_writes],
                    "command_results": [
                        {"command": item.command, "returncode": item.returncode} for item in command_results
                    ],
                },
            )
        )
        self.db.commit()
        self.db.refresh(job)

        return GatewayApplyOutcome(
            job=job,
            rendered_configs=rendered,
            commands=commands,
            executed=status == "applied",
            file_writes=file_writes,
            command_results=command_results,
            status=status,
            error_message=error_message,
        )

    def authenticate_hotspot(self, payload: dict[str, Any]) -> dict[str, Any]:
        method = payload["method"]
        client_ip = payload.get("client_ip")
        client_mac = payload.get("client_mac")
        nas_ip = payload.get("nas_ip")

        if method == "user":
            username = payload.get("username") or ""
            password = payload.get("password") or ""
            user = self.db.query(User).filter(User.username == username).first()
            if not user or not verify_password(password, user.password_hash):
                attempt = RadiusAuthAttempt(
                    username=username,
                    auth_method="user",
                    result="rejected",
                    reason="invalid_credentials",
                    client_ip=client_ip,
                    client_mac=client_mac,
                    nas_ip=nas_ip,
                )
                self.db.add(attempt)
                self.db.commit()
                self.db.refresh(attempt)
                return {
                    "accepted": False,
                    "method": "user",
                    "message": "Invalid credentials",
                    "username": username,
                    "attempt_id": attempt.id,
                }

            plan = user.current_plan or self.db.query(AccessPlan).filter(AccessPlan.status == "active").order_by(AccessPlan.id.asc()).first()
            session_token = secrets.token_urlsafe(32)
            now = datetime.now(timezone.utc)
            session = HotspotSession(
                user_id=user.id,
                plan_id=plan.id if plan else None,
                session_token=session_token,
                ip_address=client_ip,
                mac_address=client_mac,
                status="active",
                bytes_up=0,
                bytes_down=0,
                started_at=now,
                last_seen_at=now,
            )
            self.db.add(session)
            attempt = RadiusAuthAttempt(
                username=username,
                auth_method="user",
                result="accepted",
                reason="authenticated",
                client_ip=client_ip,
                client_mac=client_mac,
                nas_ip=nas_ip,
                plan_name=plan.plan_name if plan else None,
                session_token=session_token,
            )
            self.db.add(attempt)
            self.db.commit()
            self.db.refresh(attempt)
            return {
                "accepted": True,
                "method": "user",
                "message": "User authenticated",
                "username": username,
                "plan_name": plan.plan_name if plan else None,
                "session_token": session_token,
                "attempt_id": attempt.id,
            }

        voucher_code = payload.get("voucher_code") or ""
        pin = payload.get("pin") or ""
        voucher = self.db.query(Voucher).filter(Voucher.code == voucher_code).first()
        if not voucher or voucher.pin != pin or voucher.status != "available":
            attempt = RadiusAuthAttempt(
                username=voucher_code or "voucher",
                auth_method="voucher",
                result="rejected",
                reason="invalid_or_used_voucher",
                client_ip=client_ip,
                client_mac=client_mac,
                nas_ip=nas_ip,
                voucher_code=voucher_code or None,
            )
            self.db.add(attempt)
            self.db.commit()
            self.db.refresh(attempt)
            return {
                "accepted": False,
                "method": "voucher",
                "message": "Voucher is invalid or already used",
                "voucher_code": voucher_code,
                "attempt_id": attempt.id,
            }

        voucher.status = "redeemed"
        voucher.redeemed_at = datetime.now(timezone.utc)
        plan = self.db.query(AccessPlan).filter(AccessPlan.status == "active").order_by(AccessPlan.id.asc()).first()
        attempt = RadiusAuthAttempt(
            username=voucher_code,
            auth_method="voucher",
            result="accepted",
            reason="voucher_redeemed",
            client_ip=client_ip,
            client_mac=client_mac,
            nas_ip=nas_ip,
            voucher_code=voucher_code,
            plan_name=plan.plan_name if plan else None,
        )
        self.db.add(attempt)
        self.db.commit()
        self.db.refresh(attempt)
        return {
            "accepted": True,
            "method": "voucher",
            "message": "Voucher redeemed",
            "voucher_code": voucher_code,
            "plan_name": plan.plan_name if plan else None,
            "attempt_id": attempt.id,
        }
