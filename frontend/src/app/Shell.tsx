import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  ChevronRight,
  FileCheck,
  Key,
  Layers,
  Layers2,
  Network,
  Plus,
  Radio,
  Search,
  Server,
  Settings,
  Shield,
  Smartphone,
  Upload,
  Users as UsersIcon,
  Wifi,
  Clock,
  BookOpen,
  Cpu,
  HardDrive,
  Globe,
  RefreshCw,
} from "lucide-react";
import { createRecord, deleteRecord, getDashboard, getList, updateRecord } from "../shared/api";
import { useAuth } from "../shared/auth";
import type { DashboardSummary, User } from "../shared/types";
import type { CrudConfig, FormField } from "../shared/forms";
import GatewayPage from "../modules/gateway/GatewayPage";

type Keyed = { id: number };

const navItems = [
  ["Dashboard", "/"],
  ["Users", "/users"],
  ["Plans", "/plans"],
  ["Vouchers", "/vouchers"],
  ["Active Sessions", "/sessions"],
  ["Network", "/network"],
  ["WAN", "/wan"],
  ["Firewall", "/firewall"],
  ["Gateway", "/gateway"],
  ["License", "/license"],
  ["Firmware", "/firmware"],
  ["Telemetry", "/telemetry"],
];

const navSections = [
  {
    title: "Command Center",
    items: [
      ["Overview", "/", Network],
      ["Network Map", "/network", Globe],
      ["Events", "/telemetry", Bell],
    ],
  },
  {
    title: "Network",
    items: [
      ["Interfaces", "/network", Settings],
      ["WAN", "/wan", Wifi],
      ["VLAN", "/network", Layers],
      ["Routing", "/routing", Network],
      ["Port Forwarding", "/port-forwarding", Layers2],
      ["DHCP & DNS", "/dhcp-dns", Globe],
      ["DynDNS", "/dyndns", RefreshCw],
    ],
  },
  {
    title: "Access Control",
    items: [
      ["Users", "/users", UsersIcon],
      ["Plans", "/plans", BookOpen],
      ["Voucher", "/vouchers", Key],
      ["Captive Portal", "/gateway", Smartphone],
      ["RADIUS", "/gateway", Radio],
    ],
  },
  {
    title: "Active Sessions",
    items: [
      ["Sessions", "/sessions", Clock],
      ["Bandwidth Toppers", "/bandwidth-toppers", Upload],
      ["User's Account", "/user-accounts", UsersIcon],
      ["Login Status", "/login-status", FileCheck],
      ["Login Log", "/login-log", BookOpen],
      ["Logout Log", "/logout-log", AlertTriangle],
    ],
  },
  {
    title: "Security",
    items: [
      ["Firewall", "/firewall", Shield],
      ["NAT", "/firewall", Layers2],
      ["Policies", "/firewall", FileCheck],
    ],
  },
  {
    title: "Operations",
    items: [
      ["Monitoring", "/telemetry", Cpu],
      ["Reports", "/telemetry", FileCheck],
      ["Audit Log", "/telemetry", BookOpen],
      ["Alerts", "/telemetry", AlertTriangle],
    ],
  },
  {
    title: "System",
    items: [
      ["Firmware", "/firmware", HardDrive],
      ["Licensing", "/license", Shield],
      ["Backup", "/telemetry", Upload],
      ["Settings", "/telemetry", Settings],
    ],
  },
] as const;

const NAV_SECTION_STORAGE_KEY = "tinnicore-nav-sections";

function isSectionRouteActive(section: (typeof navSections)[number], pathname: string) {
  return section.items.some(([, to]) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`)));
}

function Sparkline({
  data,
  dataKey,
  stroke,
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  stroke: string;
}) {
  if (!data.length) {
    return <div className="h-9 rounded-full bg-slate-900/80" />;
  }

  const values = data.map((item) => Number(item[dataKey] ?? 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 28 - ((value - min) / span) * 22;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 28" className="h-9 w-full">
      <polyline fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function DashboardMetric({
  label,
  value,
  hint,
  accent = "blue",
  delta,
  data,
  dataKey,
}: {
  label: string;
  value: string | number;
  hint: string;
  accent?: "blue" | "green" | "purple" | "red";
  delta?: string;
  data?: Array<Record<string, string | number>>;
  dataKey?: string;
}) {
  const accentMap = {
    blue: "text-blue-600",
    green: "text-emerald-600",
    purple: "text-violet-600",
    red: "text-rose-600",
  };

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-blue-900/30 bg-[#071423] p-5 shadow-glow">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
          <div className="mt-1 text-sm text-slate-400">{hint}</div>
        </div>
        {data && dataKey ? (
          <div className="w-24 drop-shadow-[0_0_12px_rgba(25,216,255,0.35)]">
            <Sparkline data={data} dataKey={dataKey} stroke={accent === "red" ? "#ef4444" : accent === "green" ? "#10b981" : accent === "purple" ? "#8b5cf6" : "#2563eb"} />
          </div>
        ) : null}
      </div>
      {delta ? <div className={`mt-4 text-sm font-semibold ${accentMap[accent]}`}>{delta}</div> : null}
    </div>
  );
}

function DashboardPage() {
  const dashboard = useQuery<DashboardSummary>({ queryKey: ["dashboard"], queryFn: getDashboard });
  const summary = dashboard.data;
  const bandwidth = summary?.bandwidth_usage ?? [];
  const health = summary ? Math.round((100 - Number(summary.system_health.cpu) + (100 - Number(summary.system_health.memory)) + (100 - Number(summary.system_health.disk))) / 3) : 92;
  const onlineUsers = summary?.online_users ?? 0;
  const activeSessions = summary?.active_sessions ?? 0;
  const lanNetworks = summary?.total_lan_networks ?? 0;
  const voucherBatches = summary?.total_voucher_batches ?? 0;
  const totalUsers = summary?.total_users ?? 0;
  const totalInterfaces = summary?.total_interfaces ?? 0;
  const cpu = summary?.system_health.cpu ?? 23;
  const memory = summary?.system_health.memory ?? 41;
  const disk = summary?.system_health.disk ?? 37;
  const temperature = summary?.system_health.temperature ?? 0;
  const uptimeLabel = summary?.system_runtime.uptime_label ?? "0M";
  const primaryIp = summary?.system_runtime.primary_ip ?? "127.0.0.1";
  const wanRows = summary?.wan_interfaces ?? [];
  const bandwidthDown = summary?.bandwidth_totals.download_mb ?? 0;
  const bandwidthUp = summary?.bandwidth_totals.upload_mb ?? 0;
  const interfaceRows = summary?.interfaces?.length ? summary.interfaces : [];
  const alerts = summary?.recent_alerts?.length ? summary.recent_alerts : [
    { severity: "warning", message: "High bandwidth usage on WAN 1", status: "2m ago" },
    { severity: "warning", message: "RADIUS server latency high", status: "8m ago" },
    { severity: "info", message: "New device connected", status: "15m ago" },
    { severity: "info", message: "Voucher limit reached", status: "32m ago" },
    { severity: "critical", message: "Unusual login attempt blocked", status: "1h ago" },
  ];
  const chartData = bandwidth.length ? bandwidth : [
    { name: "00:00", down: 900, up: 420 },
    { name: "04:00", down: 1260, up: 520 },
    { name: "08:00", down: 1080, up: 470 },
    { name: "12:00", down: 1780, up: 760 },
    { name: "16:00", down: 1240, up: 610 },
    { name: "20:00", down: 1390, up: 560 },
    { name: "24:00", down: 1260, up: 437 },
  ];

  return (
    <div className="space-y-3">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-[1.15fr_1.5fr_1.5fr_1.15fr_1.15fr]">
        <ReferenceStat label="Interfaces" value={totalInterfaces} hint={`${primaryIp} primary IP`} tone="green" icon={<Shield className="h-6 w-6" />} />
        <ReferenceStat label="CPU" value={`${cpu}%`} hint="Live processor load" tone="blue" sparkData={chartData} dataKey="down" />
        <ReferenceStat label="Memory" value={`${memory}%`} hint="Working set" tone="cyan" sparkData={chartData} dataKey="up" />
        <ReferenceStat label="Temp" value={temperature ? `${temperature}°C` : "N/A"} hint="Thermal state" tone="amber" sparkData={chartData} dataKey="up" />
        <ReferenceStat label="Uptime" value={uptimeLabel} hint={summary?.system_runtime.hostname ?? "System runtime"} tone="blue" />
      </section>

      <section className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_432px]">
        <div className="relative min-h-[610px] overflow-hidden rounded-lg border border-[#0d274c] bg-[#020813] p-5 shadow-glow">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,149,255,0.24)_1px,transparent_1px)] [background-size:13px_13px] opacity-25" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,149,255,0.18),transparent_42%)]" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase text-slate-300">Tinnicore OS Core Topology</div>
              <div className="text-[11px] text-blue-400">Total sites linked & client connections overview</div>
            </div>
            <div className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold uppercase text-blue-300">Live</div>
          </div>

          <div className="relative mt-7 min-h-[505px]">
            <div className="absolute left-1/2 top-1/2 h-[430px] w-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-500/20" />
            <div className="absolute left-1/2 top-1/2 h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-500/20" />
            <div className="absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/30" />
            <div className="absolute left-[18%] right-[18%] top-1/2 h-px bg-cyan-400/40" />
            <div className="absolute left-1/2 top-[15%] bottom-[15%] w-px bg-cyan-400/40" />
            <div className="absolute left-[23%] top-[28%] h-px w-[54%] rotate-[28deg] bg-cyan-400/35" />
            <div className="absolute left-[23%] bottom-[28%] h-px w-[54%] -rotate-[28deg] bg-cyan-400/35" />

            <TopologyNode className="left-1/2 top-0 -translate-x-1/2" title="INTERNET" subtitle="Global Connectivity" value="Status: Online" icon={<Globe className="h-8 w-8" />} />
            <TopologyNode className="left-[11%] top-[26%]" title="USERS" subtitle="Subscriber Accounts" value={`${totalUsers.toLocaleString()} Users`} icon={<UsersIcon className="h-8 w-8" />} />
            <TopologyNode className="right-[6%] top-[25%]" title="LAN NETWORKS" subtitle="Internal Segments" value={`${lanNetworks} Networks`} icon={<Network className="h-8 w-8" />} />
            <TopologyNode className="left-[10%] bottom-[17%]" title="VOUCHER BATCHES" subtitle="Access Code Pools" value={`${voucherBatches} Batches`} icon={<Key className="h-8 w-8" />} />
            <TopologyNode className="right-[6%] bottom-[17%]" title="SESSIONS" subtitle="Active Connections" value={`${activeSessions.toLocaleString()} Sessions`} icon={<Radio className="h-8 w-8" />} />
            <TopologyNode className="left-1/2 bottom-0 -translate-x-1/2" title="CLIENTS" subtitle={`${onlineUsers.toLocaleString()} Online`} value={`${totalInterfaces} Interfaces`} icon={<UsersIcon className="h-8 w-8" />} />

            <div className="absolute left-1/2 top-1/2 flex h-48 w-48 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-cyan-400/60 bg-[#061326] text-center shadow-[0_0_54px_rgba(0,149,255,0.45)]">
              <div className="flex h-16 w-24 items-center justify-center rounded-lg border border-blue-500/30 bg-[#0b1b32] shadow-inner">
                <Server className="h-9 w-9 text-blue-300" />
              </div>
              <div className="mt-3 text-2xl font-black text-white">TINNICORE</div>
              <div className="mt-1 text-xs font-semibold uppercase text-cyan-300">Network Core</div>
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <ReferencePanel title="System Health">
            <div className="flex items-center gap-6">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[8px] border-[#10223a]">
                <div className="absolute inset-0 rounded-full border-[8px] border-emerald-400 border-l-transparent border-b-transparent" />
                <div className="text-center">
                  <div className="text-3xl font-black text-white">{health}</div>
                  <div className="text-[10px] text-slate-400">/100</div>
                </div>
              </div>
              <div className="flex-1 space-y-2 text-xs">
                <HealthBar label="CPU Usage" value={cpu} />
                <HealthBar label="Memory Usage" value={memory} />
                <HealthBar label="Temperature" value={temperature} />
                <HealthBar label="Disk Usage" value={disk} />
                <div className="flex justify-between text-slate-300"><span>Uptime</span><strong>{uptimeLabel}</strong></div>
              </div>
            </div>
          </ReferencePanel>

          <ReferencePanel title="Active Alerts" action="View All">
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert, index) => (
                <div key={`${alert.message}-${index}`} className="flex items-center justify-between border-b border-[#0f223d] pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${alert.severity === "critical" ? "text-red-400" : alert.severity === "warning" ? "text-amber-400" : "text-emerald-400"}`} />
                    <span className="text-xs font-medium text-slate-200">{alert.message}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{alert.status}</span>
                </div>
              ))}
            </div>
          </ReferencePanel>

          <ReferencePanel title="Bandwidth Overview">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="refDown" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#0f7dff" stopOpacity={0.42} />
                      <stop offset="95%" stopColor="#0f7dff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="refUp" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#0f223d" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#6f89ad" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6f89ad" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#061326", border: "1px solid #0d274c", borderRadius: 8 }} />
                  <Area dataKey="down" stroke="#0f7dff" fill="url(#refDown)" strokeWidth={2} />
                  <Area dataKey="up" stroke="#10b981" fill="url(#refUp)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-slate-500">Download</span><div className="text-lg font-bold text-white">{formatMegabytes(bandwidthDown)}</div><span className="text-slate-400">session traffic</span></div>
              <div><span className="text-slate-500">Upload</span><div className="text-lg font-bold text-white">{formatMegabytes(bandwidthUp)}</div><span className="text-slate-400">session traffic</span></div>
            </div>
          </ReferencePanel>

          <ReferencePanel title="WAN Status" action="Details">
            <WanStatusTable compact rows={wanRows} />
          </ReferencePanel>
        </aside>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_1.25fr_1fr]">
        <ReferencePanel title="Interface Summary">
          <InterfaceRows rows={interfaceRows} />
        </ReferencePanel>
        <ReferencePanel title="Platform Inventory">
          <div className="flex items-center gap-4">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-[10px] border-blue-600">
              <div className="absolute inset-0 rounded-full border-[10px] border-emerald-400 border-l-transparent border-b-transparent" />
              <div className="text-center"><div className="text-xl font-black text-white">{summary?.total_plans ?? 0}</div><div className="text-[10px] text-slate-400">Plans</div></div>
            </div>
            <div className="flex-1 space-y-2 text-xs text-slate-300">
              <DataSite label="Users" value={String(totalUsers)} pct="accounts" color="bg-blue-500" />
              <DataSite label="Voucher Batches" value={String(voucherBatches)} pct="configured" color="bg-emerald-400" />
              <DataSite label="LAN Networks" value={String(lanNetworks)} pct="segments" color="bg-amber-400" />
              <DataSite label="Firewall Rules" value={String(summary?.total_firewall_rules ?? 0)} pct="enabled" color="bg-sky-400" />
            </div>
          </div>
        </ReferencePanel>
        <ReferencePanel title="Device Information">
          <DeviceRows summary={summary} />
        </ReferencePanel>
        <ReferencePanel title="License Status">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"><Shield className="h-9 w-9" /></div>
            <div>
              <div className="text-lg font-bold text-emerald-400">{summary?.device_info.license ?? "Active"}</div>
              <div className="text-xs text-slate-400">{summary?.device_info.license_expires_at ? `Expires on ${new Date(summary.device_info.license_expires_at).toLocaleDateString()}` : "Expiry not set"}</div>
              <button className="mt-3 rounded border border-[#0f223d] bg-[#081223] px-4 py-2 text-xs font-semibold text-blue-300">Manage License</button>
            </div>
          </div>
        </ReferencePanel>
        <ReferencePanel title="Live System Metrics">
          <div className="grid grid-cols-2 gap-2">
            <MiniMetric label="CPU" value={`${cpu}%`} color="blue" />
            <MiniMetric label="RAM" value={`${memory}%`} color="cyan" />
            <MiniMetric label="Temperature" value={temperature ? `${temperature}°C` : "N/A"} color="red" />
            <MiniMetric label="Disk" value={`${disk}%`} color="red" />
          </div>
        </ReferencePanel>
      </section>
    </div>
  );
}

function formatMegabytes(value: number) {
  if (value >= 1024) {
    return `${(value / 1024).toFixed(2)} GB`;
  }
  return `${value.toFixed(2)} MB`;
}

function HealthBar({ label, value }: { label: string; value: number }) {
  const percent = Math.max(0, Math.min(100, Number(value)));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#081223]">
        <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ReferenceStat({
  label,
  value,
  hint,
  tone,
  icon,
  sparkData,
  dataKey,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone: "blue" | "green" | "cyan" | "amber";
  icon?: ReactNode;
  sparkData?: Array<Record<string, string | number>>;
  dataKey?: string;
}) {
  const toneMap = {
    blue: "text-blue-300",
    green: "text-emerald-400",
    cyan: "text-cyan-300",
    amber: "text-amber-300",
  };

  return (
    <div className="flex min-h-[72px] items-center justify-between rounded-lg border border-[#0d274c] bg-[#020813] px-4 py-3 shadow-glow">
      <div className="flex min-w-0 items-center gap-3">
        {icon ? <div className={`shrink-0 ${toneMap[tone]}`}>{icon}</div> : null}
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase text-slate-400">{label}</div>
          <div className={`mt-1 text-2xl font-black ${toneMap[tone]}`}>{value}</div>
          <div className="truncate text-[10px] text-slate-500">{hint}</div>
        </div>
      </div>
      {sparkData && dataKey ? (
        <div className="ml-3 w-24 shrink-0">
          <Sparkline data={sparkData} dataKey={dataKey} stroke={tone === "cyan" ? "#19d8ff" : tone === "amber" ? "#f59e0b" : "#0f7dff"} />
        </div>
      ) : null}
    </div>
  );
}

function ReferencePanel({ title, action, children }: { title: string; action?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#0d274c] bg-[#020813] p-4 shadow-glow">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-slate-200">{title}</h3>
        {action ? <button className="text-xs text-blue-300">{action}</button> : null}
      </div>
      {children}
    </div>
  );
}

function TopologyNode({
  className,
  title,
  subtitle,
  value,
  icon,
}: {
  className: string;
  title: string;
  subtitle: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className={`absolute z-10 w-44 rounded-lg border border-cyan-400/35 bg-[#061326]/95 p-4 shadow-[0_0_32px_rgba(0,149,255,0.16)] ${className}`}>
      <div className="flex items-center gap-3">
        <div className="text-cyan-300">{icon}</div>
        <div>
          <div className="text-sm font-bold text-white">{title}</div>
          <div className="text-[11px] text-slate-400">{subtitle}</div>
        </div>
      </div>
      <div className="mt-3 text-xs font-semibold text-emerald-400">{value}</div>
    </div>
  );
}

function WanStatusTable({
  compact = false,
  rows = [],
}: {
  compact?: boolean;
  rows?: Array<{ name: string; status: string; latency_ms?: number | null; loss_percent?: number | null }>;
}) {
  const displayRows = rows.length
    ? rows.map((row) => [row.name, row.status, row.latency_ms ? `${row.latency_ms} ms` : "-", row.loss_percent ? `${row.loss_percent}% loss` : "-", "-"] as const)
    : ([["WAN", "Unknown", "-", "-", "-"]] as const);
  return (
    <div className="overflow-hidden rounded border border-[#0f223d]">
      <table className="w-full text-left text-[11px]">
        <thead className="bg-[#081223] uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">WAN</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Latency</th>
            {!compact ? <th className="px-3 py-2">Download</th> : null}
            <th className="px-3 py-2">Upload</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#0f223d]">
          {displayRows.map(([wan, status, latency, down, up]) => (
            <tr key={wan}>
              <td className="px-3 py-2 font-semibold text-slate-200">{wan}</td>
              <td className="px-3 py-2"><StatusPill status={status.toLowerCase() === "up" || status.toLowerCase() === "online" ? "Online" : "Offline"} /></td>
              <td className="px-3 py-2 text-slate-400">{latency}</td>
              {!compact ? <td className="px-3 py-2 text-slate-400">{down}</td> : null}
              <td className="px-3 py-2 text-slate-400">{up}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InterfaceRows({ rows }: { rows: Array<{ name: string; role: string; address?: string | null; status: string; kind: string }> }) {
  return (
    <div className="space-y-3">
      {rows.length ? rows.slice(0, 5).map((row) => (
        <div key={row.name} className="rounded border border-[#0f223d] bg-[#081223] px-3 py-2">
          <div className="mb-1 flex justify-between text-[11px] text-slate-300"><span>{row.name}</span><span className="uppercase">{row.role}</span></div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>{row.address || row.kind}</span>
            <span className={row.status === "online" ? "text-emerald-400" : "text-slate-500"}>{row.status}</span>
          </div>
        </div>
      )) : <div className="text-sm text-slate-500">No interfaces configured yet.</div>}
    </div>
  );
}

function DataSite({ label, value, pct, color }: { label: string; value: string; pct: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>
      <strong className="text-white">{value} <span className="text-slate-500">{pct}</span></strong>
    </div>
  );
}

function DeviceRows({ summary }: { summary?: DashboardSummary }) {
  return (
    <div className="space-y-2 text-[11px] text-slate-400">
      {[
        ["Model", summary?.device_info.model ?? "TINNICORE 150"],
        ["Serial Number", summary?.device_info.serial_number ?? "Unknown"],
        ["Firmware", summary?.device_info.firmware ?? "v1.2.8"],
        ["OS Version", summary?.device_info.os_version ?? "TINNICORE OS"],
        ["CPU", `${summary?.device_info.cpu_cores ?? 0} Cores`],
        ["Memory", summary ? `${(summary.device_info.memory_total_mb / 1024).toFixed(1)} GB` : "Unknown"],
        ["Hostname", summary?.device_info.hostname ?? "Unknown"],
        ["Primary IP", summary?.device_info.primary_ip ?? "Unknown"],
      ].map(([label, value]) => (
        <div key={label} className="flex justify-between border-b border-[#0f223d] pb-1 last:border-0">
          <span>{label}</span>
          <strong className="text-slate-200">{value}</strong>
        </div>
      ))}
    </div>
  );
}

function MiniMetric({ label, value, color }: { label: string; value: string; color: "blue" | "cyan" | "red" }) {
  const colorMap = {
    blue: "text-blue-300 border-blue-500/20 bg-blue-500/10",
    cyan: "text-cyan-300 border-cyan-500/20 bg-cyan-500/10",
    red: "text-red-300 border-red-500/20 bg-red-500/10",
  };
  return (
    <div className={`rounded-lg border p-3 ${colorMap[color]}`}>
      <div className="text-[10px] uppercase text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
}

function TopologyCard({ title, subtitle, value, status }: { title: string; subtitle: string; value: string; status: string }) {
  return (
    <div className="rounded-[24px] border border-cyan-400/20 bg-[#081325] p-5 shadow-glow">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-lg text-cyan-300">◎</div>
        <div>
          <div className="font-semibold text-white">{title}</div>
          <div className="text-xs text-slate-400">{subtitle}</div>
        </div>
      </div>
      <div className="mt-4 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-emerald-400">{status}</div>
    </div>
  );
}

function NetworkPod({ title, value, subtitle, clients }: { title: string; value: string; subtitle: string; clients: string }) {
  return (
    <div className="rounded-[22px] border border-cyan-400/20 bg-[#081325] p-4 shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-white">{title}</div>
          <div className="text-xs text-slate-400">{subtitle}</div>
        </div>
        <div className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-300">{value}</div>
      </div>
      <div className="mt-3 text-sm text-slate-400">{clients}</div>
    </div>
  );
}

function InputField({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-3 rounded-2xl border border-blue-900/30 bg-[#081223] px-4 py-3">
        <input
          checked={value === "true"}
          onChange={(event) => onChange(event.target.checked ? "true" : "false")}
          type="checkbox"
          className="h-4 w-4 rounded border-blue-900/30 bg-[#02050a] text-blue-500"
        />
        <span className="text-sm text-slate-200">{field.label}</span>
      </label>
    );
  }

  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-300">{field.label}</span>
      <input
        value={value}
        onChange={(event) => onChange(field.type === "number" ? event.target.value.replace(/[^\d-]/g, "") : event.target.value)}
        type={field.type === "number" ? "text" : field.type ?? "text"}
        placeholder={field.placeholder}
        className="w-full rounded-2xl border border-blue-900/30 bg-[#081223] px-4 py-3 text-white outline-none transition focus:border-blue-500"
      />
      {field.help ? <div className="mt-1 text-xs text-slate-500">{field.help}</div> : null}
    </label>
  );
}

function toggleList(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function CrudPage<T extends Keyed>({
  config,
}: {
  config: CrudConfig<T> & {
    updatePath: (item: T) => string;
    deletePath: (item: T) => string;
    buildCreatePayload: (values: Record<string, string>) => unknown;
    buildUpdatePayload: (values: Record<string, string>, selected: T) => unknown;
    renderItem: (item: T) => Record<string, string | number | boolean | null | undefined>;
  };
}) {
  const queryClient = useQueryClient();
  const query = useQuery<T[]>({ queryKey: [config.path], queryFn: () => getList<T[]>(config.path) });
  const [selected, setSelected] = useState<T | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(config.fields.map((field) => [field.name, String(config.defaultValues?.[field.name] ?? "")])),
  );

  const reset = () => {
    setSelected(null);
    setValues(Object.fromEntries(config.fields.map((field) => [field.name, String(config.defaultValues?.[field.name] ?? "")])));
  };

  const createMutation = useMutation({
    mutationFn: (payload: unknown) => createRecord<T>(config.path, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [config.path] });
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ item, payload }: { item: T; payload: unknown }) => updateRecord<T>(config.updatePath(item), payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [config.path] });
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (item: T) => deleteRecord(config.deletePath(item)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [config.path] });
      if (selected) reset();
    },
  });

  const rows = query.data ?? [];
  const selectedMap = selected ? config.renderItem(selected) : null;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-panel rounded-3xl border border-blue-900/30 p-6 shadow-glow">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">{config.title}</h1>
              <p className="mt-1 text-sm text-slate-400">{selected ? "Edit the selected record" : config.createLabel}</p>
            </div>
            {selected ? (
              <button type="button" onClick={reset} className="rounded-full border border-blue-900/30 px-3 py-1 text-xs text-slate-300">
                Clear
              </button>
            ) : null}
          </div>

          <div className="mt-6 space-y-4">
            {config.fields.map((field) => (
              <InputField
                key={field.name}
                field={field}
                value={values[field.name] ?? ""}
                onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
              />
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={async () => {
                const payload = selected
                  ? config.buildUpdatePayload(values, selected)
                  : config.buildCreatePayload(values);
                if (selected) {
                  await updateMutation.mutateAsync({ item: selected, payload });
                } else {
                  await createMutation.mutateAsync(payload);
                }
              }}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-400 px-4 py-3 font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {selected ? "Save changes" : config.createLabel}
            </button>
          </div>

          {selectedMap ? (
            <div className="mt-6 rounded-2xl border border-blue-900/30 bg-[#081223] p-4 text-xs text-slate-300">
              <div className="mb-2 font-semibold text-white">Selected record</div>
              <pre className="overflow-auto whitespace-pre-wrap">{JSON.stringify(selectedMap, null, 2)}</pre>
            </div>
          ) : null}
        </div>

        <div className="glass-panel rounded-3xl border border-blue-900/30 p-6 shadow-glow">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Records</h2>
              <p className="text-sm text-slate-400">{rows.length} item(s)</p>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-blue-900/30">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#081223] text-left text-slate-300">
                <tr>
                  {config.fields.map((field) => (
                    <th key={field.name} className="px-3 py-3 font-medium">
                      {field.label}
                    </th>
                  ))}
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const row = config.renderItem(item);
                  return (
                    <tr key={item.id} className="border-t border-blue-900/20">
                      {config.fields.map((field) => (
                        <td key={field.name} className="px-3 py-3 text-slate-200">
                          {String(row[field.name] ?? "")}
                        </td>
                      ))}
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(item);
                              const nextValues = Object.fromEntries(
                                config.fields.map((field) => [field.name, String(row[field.name] ?? "")]),
                              );
                              setValues(nextValues);
                            }}
                            className="rounded-full border border-blue-900/30 px-3 py-1 text-xs text-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(item)}
                            className="rounded-full border border-red-500/30 px-3 py-1 text-xs text-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

type UserItem = User;
type PlanItem = {
  id: number;
  plan_name: string;
  download_kbps: number;
  upload_kbps: number;
  max_data_mb: number | null;
  max_duration_minutes: number | null;
  idle_timeout_minutes: number | null;
  concurrent_sessions: number;
  status: string;
  use_for_new_vouchers: boolean;
  voucher_type: string;
  random_user_id_string_type: string;
  random_user_id_prefix: string;
  password_type: string;
  voucher_password: string | null;
  currency_type: string;
  plan_charge: number | null;
  login_method: string;
  mac_binding: boolean;
  mobile_registration: boolean;
  account_validity_type: string;
  account_validity_days: number | null;
  voucher_validity_days: number | null;
  upload_limit_mode: string;
  download_limit_mode: string;
  delete_inactive_accounts: boolean;
  max_inactive_days: number | null;
};
type PlanFormState = {
  plan_name: string;
  use_for_new_vouchers: "true" | "false";
  voucher_type: string;
  random_user_id_string_type: string;
  random_user_id_prefix: string;
  password_type: string;
  voucher_password: string;
  currency_type: string;
  plan_charge: string;
  login_method: string;
  mac_binding: "true" | "false";
  concurrent_sessions: string;
  mobile_registration: "true" | "false";
  account_validity_type: string;
  account_validity_days: string;
  voucher_validity_days: string;
  max_duration_minutes: string;
  max_data_mb: string;
  upload_limit_mode: string;
  upload_kbps: string;
  download_limit_mode: string;
  download_kbps: string;
  idle_timeout_minutes: string;
  delete_inactive_accounts: "true" | "false";
  max_inactive_days: string;
  status: string;
};
type UserFormState = {
  username: string;
  email: string;
  full_name: string;
  password: string;
  is_admin: "true" | "false";
  current_plan_id: string;
};

type VoucherBatch = {
  id: number;
  batch_name: string;
  code_prefix: string;
  quantity: number;
  status: string;
  expires_at: string | null;
};

type VoucherItem = {
  id: number;
  batch_id: number;
  code: string;
  pin: string;
  status: string;
  redeemed_at: string | null;
  blocked_at: string | null;
};

type FirewallZone = {
  id: number;
  name: string;
  policy: string;
  interfaces: string[] | null;
};

type FirewallRule = {
  id: number;
  zone_id: number;
  destination_zone_id: number | null;
  rule_name: string;
  action: string;
  time_restriction: string;
  connections_per_second: string;
  source: string | null;
  source_mac: string | null;
  exclude_source: string | null;
  exclude_source_mac: string | null;
  source_interface: string | null;
  destination: string | null;
  exclude_destination: string | null;
  destination_interface: string | null;
  protocol: string | null;
  port: string | null;
  log: boolean;
  comment: string | null;
  enabled: boolean;
};

type FirewallRuleForm = Omit<FirewallRule, "id">;

const defaultFirewallRuleForm: FirewallRuleForm = {
  zone_id: 0,
  destination_zone_id: null,
  rule_name: "",
  action: "accept",
  time_restriction: "disable",
  connections_per_second: "no_limit",
  source: "any",
  source_mac: "any",
  exclude_source: "none",
  exclude_source_mac: "none",
  source_interface: "any",
  destination: "",
  exclude_destination: "none",
  destination_interface: "any",
  protocol: "",
  port: "",
  log: false,
  comment: "",
  enabled: true,
};

type PortForwardItem = {
  id: number;
  name: string;
  action: string;
  time_restriction: string;
  connections_per_second: string;
  incoming_zone: string | null;
  external_port: string;
  original_destination: string | null;
  exclude_original_destination: string | null;
  forward_zone: string | null;
  server_type: string;
  internal_ip: string;
  internal_port: string;
  forward_port_mode: string;
  hairpin_snat_interface: string | null;
  source_address: string | null;
  exclude_source_address: string | null;
  source_ports: string | null;
  source_interface: string | null;
  protocol: string;
  log: boolean;
  comment: string | null;
  enabled: boolean;
};

type PortForwardForm = Omit<PortForwardItem, "id">;

const defaultPortForwardForm: PortForwardForm = {
  name: "",
  action: "forward",
  time_restriction: "disable",
  connections_per_second: "no_limit",
  incoming_zone: "wan",
  external_port: "",
  original_destination: "any",
  exclude_original_destination: "none",
  forward_zone: "dmz",
  server_type: "single_server",
  internal_ip: "",
  internal_port: "",
  forward_port_mode: "original_port",
  hairpin_snat_interface: "disable",
  source_address: "any",
  exclude_source_address: "none",
  source_ports: "any",
  source_interface: "any",
  protocol: "tcp",
  log: false,
  comment: "",
  enabled: true,
};

type NetworkInterfaceItem = {
  id: number;
  name: string;
  kind: string;
  role: "wan" | "lan" | "unassigned";
  ip_mode: "dhcp" | "static";
  description: string | null;
  address: string | null;
  netmask: string | null;
  gateway: string | null;
  mtu: number | null;
  mac_address: string | null;
  is_up: boolean;
  live_addresses: Array<{ address: string; prefixlen: number; netmask: string | null }>;
  settings: Record<string, string | number | boolean | null>;
};

type DhcpScopeItem = {
  id: number;
  interface_id: number;
  scope_name: string;
  enabled: boolean;
  start_ip: string;
  end_ip: string;
  subnet_mask: string | null;
  gateway: string | null;
  dns_primary: string | null;
  dns_secondary: string | null;
  domain_name: string | null;
  lease_minutes: number;
  options: Record<string, string | number | boolean | null>;
};

type DhcpScopeForm = Omit<DhcpScopeItem, "id">;

const defaultDhcpScopeForm: DhcpScopeForm = {
  interface_id: 0,
  scope_name: "",
  enabled: true,
  start_ip: "",
  end_ip: "",
  subnet_mask: "",
  gateway: "",
  dns_primary: "",
  dns_secondary: "",
  domain_name: "",
  lease_minutes: 720,
  options: {},
};

type DnsSettingItem = {
  id: number;
  enabled: boolean;
  resolver_name: string;
  primary_dns: string;
  secondary_dns: string | null;
  search_domain: string | null;
  cache_size: number;
  local_ttl: number;
};

type DnsSettingForm = Omit<DnsSettingItem, "id">;

const defaultDnsSettingForm: DnsSettingForm = {
  enabled: true,
  resolver_name: "default",
  primary_dns: "1.1.1.1",
  secondary_dns: "8.8.8.8",
  search_domain: "tinnicore.local",
  cache_size: 1000,
  local_ttl: 300,
};

type DynamicDnsProfileItem = {
  id: number;
  profile_name: string;
  enabled: boolean;
  provider: string;
  protocol: string;
  server: string | null;
  hostnames: string;
  username: string;
  password: string;
  interface_name: string | null;
  use_ssl: boolean;
  check_url: string | null;
  update_interval_minutes: number;
  force_update_days: number | null;
  status: "active" | "disabled" | "draft";
};

type DynamicDnsProfileForm = Omit<DynamicDnsProfileItem, "id">;

const defaultDynamicDnsProfileForm: DynamicDnsProfileForm = {
  profile_name: "",
  enabled: true,
  provider: "custom",
  protocol: "dyndns2",
  server: "",
  hostnames: "",
  username: "",
  password: "",
  interface_name: "",
  use_ssl: true,
  check_url: "https://api.ipify.org",
  update_interval_minutes: 5,
  force_update_days: 30,
  status: "active",
};

type NetworkInterfaceForm = {
  role: "wan" | "lan" | "unassigned";
  ip_mode: "dhcp" | "static";
  description: string;
  address: string;
  netmask: string;
  gateway: string;
  mtu: string;
  settings: Record<string, string | number | boolean | null>;
};

type StaticRouteItem = {
  id: number;
  rule_name: string;
  enabled: boolean;
  dest_type: "network" | "host" | "default";
  destination: string;
  subnetmask: string | null;
  metric: number;
  route_type: "gateway" | "interface" | "blackhole";
  gateway: string;
  interface_name: string | null;
  floating: boolean;
};

type StaticRouteForm = Omit<StaticRouteItem, "id">;

const defaultStaticRouteForm: StaticRouteForm = {
  rule_name: "",
  enabled: true,
  dest_type: "network",
  destination: "",
  subnetmask: "",
  metric: 1,
  route_type: "gateway",
  gateway: "",
  interface_name: "",
  floating: false,
};

const defaultNetworkSettings: Record<string, string | number | boolean | null> = {
  vlan_mode: "disable",
  port_speed: "default",
  mac_address_clone: "disable",
  link_priority: 1,
  nat: "enable",
  load_balance_membership: "exclude",
  proxy_arp: "disable",
  hairpin_routing: "block",
  vpn_traffic: "allow_always",
  link_failure_detection: "ping_gateway_ip",
  maximum_upload_bandwidth: "no_limit",
  maximum_download_bandwidth: "no_limit",
  billing_day_of_month: 1,
  data_transfer_quota: "unlimited",
  additional_ip_addresses: "disable",
};

function interfaceToForm(item: NetworkInterfaceItem): NetworkInterfaceForm {
  return {
    role: item.role,
    ip_mode: item.ip_mode,
    description: item.description ?? "",
    address: item.address ?? "",
    netmask: item.netmask ?? "",
    gateway: item.gateway ?? "",
    mtu: String(item.mtu ?? 1500),
    settings: { ...defaultNetworkSettings, ...(item.settings ?? {}) },
  };
}

function NetworkInterfacesPage() {
  const queryClient = useQueryClient();
  const query = useQuery<NetworkInterfaceItem[]>({ queryKey: ["/network/interfaces"], queryFn: () => getList<NetworkInterfaceItem[]>("/network/interfaces") });
  const interfaces = query.data ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = interfaces.find((item) => item.id === selectedId) ?? interfaces[0] ?? null;
  const [form, setForm] = useState<NetworkInterfaceForm | null>(null);

  useEffect(() => {
    if (!selected) {
      setForm(null);
      return;
    }
    setSelectedId(selected.id);
    setForm(interfaceToForm(selected));
  }, [selected?.id]);

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: unknown }) => updateRecord<NetworkInterfaceItem>(`/network/interfaces/${id}`, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/network/interfaces"] });
    },
  });

  const patchForm = (patch: Partial<NetworkInterfaceForm>) => setForm((current) => (current ? { ...current, ...patch } : current));
  const patchSetting = (key: string, value: string | number) =>
    setForm((current) => (current ? { ...current, settings: { ...current.settings, [key]: value } } : current));

  return (
    <div className="space-y-3">
      <section className="grid gap-3 md:grid-cols-4">
        <MetricTile label="NICs Found" value={interfaces.length} tone="blue" />
        <MetricTile label="WAN Assigned" value={interfaces.filter((item) => item.role === "wan").length} tone="green" />
        <MetricTile label="LAN Assigned" value={interfaces.filter((item) => item.role === "lan").length} tone="cyan" />
        <MetricTile label="Links Up" value={interfaces.filter((item) => item.is_up).length} tone="amber" />
      </section>

      <section className="grid gap-3 xl:grid-cols-[330px_minmax(0,1fr)]">
        <div className="rounded-lg border border-[#0d274c] bg-[#020813] p-4 shadow-glow">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-sm font-semibold uppercase text-slate-200">Interfaces</h1>
            <button onClick={() => query.refetch()} className="rounded border border-[#0f223d] bg-[#081223] p-2 text-slate-300" title="Refresh interfaces">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {interfaces.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  setForm(interfaceToForm(item));
                }}
                className={`w-full rounded-lg border p-3 text-left transition ${selected?.id === item.id ? "border-blue-500/50 bg-blue-600/20" : "border-[#0f223d] bg-[#081223] hover:bg-[#0c2041]"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white">{item.name}</div>
                  <StatusPill status={item.is_up ? "Online" : "Offline"} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>{item.mac_address ?? "No MAC"}</span>
                  <span className="uppercase text-blue-300">{item.role}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{item.address ?? "No IPv4 address"} {item.netmask ? `/ ${item.netmask}` : ""}</div>
              </button>
            ))}
            {!interfaces.length ? <div className="rounded-lg border border-[#0f223d] bg-[#081223] p-4 text-sm text-slate-400">No interfaces discovered yet.</div> : null}
          </div>
        </div>

        <div className="rounded-lg border border-[#0d274c] bg-[#020813] p-5 shadow-glow">
          {selected && form ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#0f223d] pb-4">
                <div>
                  <div className="text-xs font-semibold uppercase text-blue-400">{selected.role === "wan" ? "WAN" : selected.role === "lan" ? "LAN" : "Unassigned"} Interface</div>
                  <h2 className="mt-1 text-2xl font-black text-white">{selected.name}</h2>
                  <div className="mt-1 text-xs text-slate-400">{selected.kind} · {selected.mac_address ?? "No MAC"} · MTU {selected.mtu ?? 1500}</div>
                </div>
                <button
                  disabled={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({
                      id: selected.id,
                      payload: {
                        role: form.role,
                        ip_mode: form.ip_mode,
                        description: form.description || null,
                        address: form.ip_mode === "static" ? form.address || null : null,
                        netmask: form.ip_mode === "static" ? form.netmask || null : null,
                        gateway: form.ip_mode === "static" ? form.gateway || null : null,
                        mtu: Number(form.mtu || 1500),
                        settings: form.settings,
                      },
                    })
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  Save Configuration
                </button>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <ReferencePanel title="Connection">
                  <div className="grid gap-3 md:grid-cols-2">
                    <NetworkSelect label="Interface Role" value={form.role} onChange={(value) => patchForm({ role: value as NetworkInterfaceForm["role"] })} options={[["wan", "WAN"], ["lan", "LAN"], ["unassigned", "Unassigned"]]} />
                    <NetworkSelect label="IP Assignment" value={form.ip_mode} onChange={(value) => patchForm({ ip_mode: value as NetworkInterfaceForm["ip_mode"] })} options={[["dhcp", "DHCP"], ["static", "Static"]]} />
                    <NetworkInput label="Description" value={form.description} onChange={(value) => patchForm({ description: value })} />
                    <NetworkInput label="MTU" value={form.mtu} onChange={(value) => patchForm({ mtu: value })} />
                  </div>
                </ReferencePanel>

                <ReferencePanel title="Static Mode">
                  <div className="grid gap-3 md:grid-cols-3">
                    <NetworkInput label="IP Address" value={form.address} onChange={(value) => patchForm({ address: value })} disabled={form.ip_mode !== "static"} />
                    <NetworkInput label="Subnet Mask" value={form.netmask} onChange={(value) => patchForm({ netmask: value })} disabled={form.ip_mode !== "static"} />
                    <NetworkInput label="Default Gateway" value={form.gateway} onChange={(value) => patchForm({ gateway: value })} disabled={form.ip_mode !== "static"} />
                    <NetworkSelect label="Additional IP Addresses" value={String(form.settings.additional_ip_addresses)} onChange={(value) => patchSetting("additional_ip_addresses", value)} options={[["disable", "Disable"], ["enable", "Enable"]]} />
                  </div>
                </ReferencePanel>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <ReferencePanel title="VLAN (802.1Q)">
                  <NetworkSelect label="VLAN Mode" value={String(form.settings.vlan_mode)} onChange={(value) => patchSetting("vlan_mode", value)} options={[["disable", "Disable"], ["access", "Access"], ["trunk", "Trunk"]]} />
                </ReferencePanel>

                <ReferencePanel title="Port Settings">
                  <div className="space-y-3">
                    <NetworkSelect label="Port Speed" value={String(form.settings.port_speed)} onChange={(value) => patchSetting("port_speed", value)} options={[["default", "Default"], ["100_full", "100 Full"], ["1000_full", "1000 Full"], ["10000_full", "10G Full"]]} />
                    <NetworkSelect label="MAC Address Clone" value={String(form.settings.mac_address_clone)} onChange={(value) => patchSetting("mac_address_clone", value)} options={[["disable", "Disable"], ["enable", "Enable"]]} />
                  </div>
                </ReferencePanel>

                <ReferencePanel title="Spillover Bandwidth">
                  <div className="space-y-3">
                    <NetworkSelect label="Maximum Upload Bandwidth" value={String(form.settings.maximum_upload_bandwidth)} onChange={(value) => patchSetting("maximum_upload_bandwidth", value)} options={[["no_limit", "No Limit"], ["custom", "Custom"]]} />
                    <NetworkSelect label="Maximum Download Bandwidth" value={String(form.settings.maximum_download_bandwidth)} onChange={(value) => patchSetting("maximum_download_bandwidth", value)} options={[["no_limit", "No Limit"], ["custom", "Custom"]]} />
                  </div>
                </ReferencePanel>
              </div>

              <ReferencePanel title="Link Properties">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <NetworkInput label="Link Priority" value={String(form.settings.link_priority)} onChange={(value) => patchSetting("link_priority", Number(value || 1))} />
                  <NetworkSelect label="NAT" value={String(form.settings.nat)} onChange={(value) => patchSetting("nat", value)} options={[["enable", "Enable"], ["disable", "Disable"]]} />
                  <NetworkSelect label="Load Balance Membership" value={String(form.settings.load_balance_membership)} onChange={(value) => patchSetting("load_balance_membership", value)} options={[["exclude", "Exclude"], ["include", "Include"]]} />
                  <NetworkSelect label="Proxy ARP" value={String(form.settings.proxy_arp)} onChange={(value) => patchSetting("proxy_arp", value)} options={[["disable", "Disable"], ["enable", "Enable"]]} />
                  <NetworkSelect label="Hairpin Routing" value={String(form.settings.hairpin_routing)} onChange={(value) => patchSetting("hairpin_routing", value)} options={[["block", "Block"], ["allow", "Allow"]]} />
                  <NetworkSelect label="VPN Traffic" value={String(form.settings.vpn_traffic)} onChange={(value) => patchSetting("vpn_traffic", value)} options={[["allow_always", "Allow Always"], ["block", "Block"]]} />
                  <NetworkSelect label="Link Failure Detection" value={String(form.settings.link_failure_detection)} onChange={(value) => patchSetting("link_failure_detection", value)} options={[["ping_gateway_ip", "Ping Gateway IP"], ["link_state", "Link State"], ["disable", "Disable"]]} />
                  <NetworkSelect label="Network Zone" value={form.role} onChange={(value) => patchForm({ role: value as NetworkInterfaceForm["role"] })} options={[["wan", "WAN"], ["lan", "LAN"], ["unassigned", "Unassigned"]]} />
                </div>
              </ReferencePanel>

              <ReferencePanel title="Data Transfer Quota">
                <div className="grid gap-3 md:grid-cols-2">
                  <NetworkInput label="Billing Day of Month" value={String(form.settings.billing_day_of_month)} onChange={(value) => patchSetting("billing_day_of_month", Number(value || 1))} />
                  <NetworkSelect label="Data Transfer Quota" value={String(form.settings.data_transfer_quota)} onChange={(value) => patchSetting("data_transfer_quota", value)} options={[["unlimited", "Unlimited"], ["custom", "Custom"]]} />
                </div>
              </ReferencePanel>
            </div>
          ) : (
            <div className="rounded-lg border border-[#0f223d] bg-[#081223] p-6 text-slate-400">Select an interface to configure.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function NetworkInput({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-md border border-[#0f223d] bg-[#081223] px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
      />
    </label>
  );
}

function NetworkSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-md border border-[#0f223d] bg-[#081223] px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500">
        {options.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StaticRoutesPage() {
  const queryClient = useQueryClient();
  const routes = useQuery<StaticRouteItem[]>({ queryKey: ["/network/static-routes"], queryFn: () => getList<StaticRouteItem[]>("/network/static-routes") });
  const interfaces = useQuery<NetworkInterfaceItem[]>({ queryKey: ["/network/interfaces"], queryFn: () => getList<NetworkInterfaceItem[]>("/network/interfaces") });
  const rows = routes.data ?? [];
  const [selected, setSelected] = useState<StaticRouteItem | null>(null);
  const [form, setForm] = useState<StaticRouteForm>(defaultStaticRouteForm);

  const reset = () => {
    setSelected(null);
    setForm(defaultStaticRouteForm);
  };

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: StaticRouteForm }) =>
      id ? updateRecord<StaticRouteItem>(`/network/static-routes/${id}`, payload) : createRecord<StaticRouteItem>("/network/static-routes", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/network/static-routes"] });
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRecord(`/network/static-routes/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/network/static-routes"] });
      reset();
    },
  });

  const selectRoute = (route: StaticRouteItem) => {
    setSelected(route);
    setForm({
      rule_name: route.rule_name,
      enabled: route.enabled,
      dest_type: route.dest_type,
      destination: route.destination,
      subnetmask: route.subnetmask ?? "",
      metric: route.metric,
      route_type: route.route_type,
      gateway: route.gateway ?? "",
      interface_name: route.interface_name ?? "",
      floating: route.floating,
    });
  };

  return (
    <div className="space-y-3">
      <section className="grid gap-3 md:grid-cols-4">
        <MetricTile label="Static Rules" value={rows.length} tone="blue" />
        <MetricTile label="Enabled" value={rows.filter((row) => row.enabled).length} tone="green" />
        <MetricTile label="Floating" value={rows.filter((row) => row.floating).length} tone="cyan" />
        <MetricTile label="Interfaces" value={interfaces.data?.length ?? 0} tone="amber" />
      </section>

      <section className="grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-lg border border-[#0d274c] bg-[#020813] p-4 shadow-glow">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-sm font-semibold uppercase text-slate-200">IPv4 Static Routes</h1>
              <p className="text-xs text-slate-500">Select a rule to configure route behavior.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="rounded border border-[#0f223d] bg-[#081223] p-2 text-slate-300" title="Add route">
                <Plus className="h-4 w-4" />
              </button>
              <button onClick={() => routes.refetch()} className="rounded border border-[#0f223d] bg-[#081223] p-2 text-slate-300" title="Refresh routes">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {rows.map((row) => (
              <button
                key={row.id}
                onClick={() => selectRoute(row)}
                className={`w-full rounded-lg border p-3 text-left transition ${selected?.id === row.id ? "border-blue-500/50 bg-blue-600/20" : "border-[#0f223d] bg-[#081223] hover:bg-[#0c2041]"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-white">{row.rule_name}</div>
                    <div className="mt-1 text-xs uppercase text-blue-300">{row.route_type} · metric {row.metric}</div>
                  </div>
                  <StatusPill status={row.enabled ? "Online" : "Offline"} />
                </div>
                <div className="mt-2 text-xs text-slate-400">{row.destination}{row.subnetmask ? ` / ${row.subnetmask}` : ""}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>GW {row.gateway || "none"}</span>
                  <span>{row.interface_name || "no interface"}</span>
                </div>
              </button>
            ))}
            {!rows.length ? <div className="rounded-lg border border-[#0f223d] bg-[#081223] p-4 text-sm text-slate-400">No static routes configured yet. Use the plus button to add the first route.</div> : null}
          </div>
        </div>

        <div className="rounded-lg border border-[#0d274c] bg-[#020813] p-5 shadow-glow">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#0f223d] pb-4">
            <div>
              <div className="text-xs font-semibold uppercase text-blue-400">{selected ? "Routing Rule" : "New Routing Rule"}</div>
              <h2 className="mt-1 text-2xl font-black text-white">{selected?.rule_name || "Static Route"}</h2>
              <div className="mt-1 text-xs text-slate-400">IPv4 route policy · {form.route_type} · {form.interface_name || "interface required"}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {selected ? (
                <button onClick={() => deleteMutation.mutate(selected.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300">
                  Delete
                </button>
              ) : null}
              <button
                disabled={saveMutation.isPending || !form.rule_name || !form.destination}
                onClick={() => saveMutation.mutate({ id: selected?.id, payload: form })}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Save Route
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <ReferencePanel title="Route Control">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <NetworkSelect label="Enable" value={form.enabled ? "enable" : "disable"} onChange={(value) => setForm((current) => ({ ...current, enabled: value === "enable" }))} options={[["enable", "Enable"], ["disable", "Disable"]]} />
                <NetworkInput label="Rule Name" value={form.rule_name} onChange={(value) => setForm((current) => ({ ...current, rule_name: value }))} />
                <NetworkSelect label="Destination Type" value={form.dest_type} onChange={(value) => setForm((current) => ({ ...current, dest_type: value as StaticRouteForm["dest_type"] }))} options={[["network", "Network"], ["host", "Host"], ["default", "Default"]]} />
                <NetworkSelect label="Float" value={form.floating ? "enable" : "disable"} onChange={(value) => setForm((current) => ({ ...current, floating: value === "enable" }))} options={[["disable", "Disable"], ["enable", "Enable"]]} />
              </div>
            </ReferencePanel>

            <ReferencePanel title="Destination">
              <div className="grid gap-3 md:grid-cols-3">
                <NetworkInput label="Destination IP" value={form.destination} onChange={(value) => setForm((current) => ({ ...current, destination: value }))} />
                <NetworkInput label="Subnetmask" value={form.subnetmask ?? ""} onChange={(value) => setForm((current) => ({ ...current, subnetmask: value }))} />
                <NetworkInput label="Metric" value={String(form.metric)} onChange={(value) => setForm((current) => ({ ...current, metric: Number(value || 1) }))} />
              </div>
            </ReferencePanel>

            <ReferencePanel title="Next Hop">
              <div className="grid gap-3 md:grid-cols-3">
                <NetworkSelect label="Route Type" value={form.route_type} onChange={(value) => setForm((current) => ({ ...current, route_type: value as StaticRouteForm["route_type"] }))} options={[["gateway", "Gateway"], ["interface", "Interface"], ["blackhole", "Blackhole"]]} />
                <NetworkInput label="Gateway IP" value={form.gateway ?? ""} onChange={(value) => setForm((current) => ({ ...current, gateway: value }))} />
                <NetworkSelect
                  label="Output Interface"
                  value={form.interface_name ?? ""}
                  onChange={(value) => setForm((current) => ({ ...current, interface_name: value }))}
                  options={[["", "Required"], ...(interfaces.data ?? []).map((item) => [item.name, item.name] as [string, string])]}
                />
              </div>
            </ReferencePanel>
          </div>
        </div>
      </section>
    </div>
  );
}

function PortForwardingPage() {
  const queryClient = useQueryClient();
  const forwards = useQuery<PortForwardItem[]>({ queryKey: ["/firewall/port-forwards"], queryFn: () => getList<PortForwardItem[]>("/firewall/port-forwards") });
  const zones = useQuery<FirewallZone[]>({ queryKey: ["/firewall/zones"], queryFn: () => getList<FirewallZone[]>("/firewall/zones") });
  const interfaces = useQuery<NetworkInterfaceItem[]>({ queryKey: ["/network/interfaces"], queryFn: () => getList<NetworkInterfaceItem[]>("/network/interfaces") });
  const rows = forwards.data ?? [];
  const zoneRows = zones.data?.length ? zones.data : [{ id: 1, name: "wan", policy: "accept", interfaces: [] }, { id: 2, name: "dmz", policy: "accept", interfaces: [] }, { id: 3, name: "lan", policy: "accept", interfaces: [] }];
  const zoneOptions: Array<[string, string]> = [["", "Required"], ...zoneRows.map((zone) => [zone.name, zone.name.toUpperCase()] as [string, string]), ["wan", "WAN"], ["lan", "LAN"], ["dmz", "DMZ"]];
  const interfaceOptions: Array<[string, string]> = [["any", "Any"], ["disable", "Disable"], ...(interfaces.data ?? []).map((item) => [item.name, item.name] as [string, string])];
  const [selected, setSelected] = useState<PortForwardItem | null>(null);
  const [form, setForm] = useState<PortForwardForm>(defaultPortForwardForm);

  const reset = () => {
    setSelected(null);
    setForm(defaultPortForwardForm);
  };

  const selectForward = (item: PortForwardItem) => {
    setSelected(item);
    setForm({
      name: item.name,
      action: item.action ?? "forward",
      time_restriction: item.time_restriction ?? "disable",
      connections_per_second: item.connections_per_second ?? "no_limit",
      incoming_zone: item.incoming_zone ?? "wan",
      external_port: item.external_port,
      original_destination: item.original_destination ?? "any",
      exclude_original_destination: item.exclude_original_destination ?? "none",
      forward_zone: item.forward_zone ?? "dmz",
      server_type: item.server_type ?? "single_server",
      internal_ip: item.internal_ip,
      internal_port: item.internal_port ?? "",
      forward_port_mode: item.forward_port_mode ?? "original_port",
      hairpin_snat_interface: item.hairpin_snat_interface ?? "disable",
      source_address: item.source_address ?? "any",
      exclude_source_address: item.exclude_source_address ?? "none",
      source_ports: item.source_ports ?? "any",
      source_interface: item.source_interface ?? "any",
      protocol: item.protocol ?? "tcp",
      log: item.log ?? false,
      comment: item.comment ?? "",
      enabled: item.enabled,
    });
  };

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: PortForwardForm }) =>
      id ? updateRecord<PortForwardItem>(`/firewall/port-forwards/${id}`, payload) : createRecord<PortForwardItem>("/firewall/port-forwards", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/firewall/port-forwards"] });
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRecord(`/firewall/port-forwards/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/firewall/port-forwards"] });
      reset();
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => createRecord<{ status: string; message: string }>("/firewall/apply", { dry_run: false, execute: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/gateway/jobs"] });
    },
  });

  const saveDisabled = saveMutation.isPending || !form.name || !form.external_port || !form.internal_ip;

  return (
    <div className="space-y-3">
      <section className="grid gap-3 md:grid-cols-4">
        <MetricTile label="Forward Rules" value={rows.length} tone="blue" />
        <MetricTile label="Enabled" value={rows.filter((row) => row.enabled).length} tone="green" />
        <MetricTile label="TCP Rules" value={rows.filter((row) => row.protocol === "tcp").length} tone="cyan" />
        <MetricTile label="Logged" value={rows.filter((row) => row.log).length} tone="amber" />
      </section>

      <section className="grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-lg border border-[#0d274c] bg-[#020813] p-4 shadow-glow">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-sm font-semibold uppercase text-slate-200">Port Forwarding</h1>
              <p className="text-xs text-slate-500">DNAT rules synced to nftables.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="rounded border border-[#0f223d] bg-[#081223] p-2 text-slate-300" title="Add port forward">
                <Plus className="h-4 w-4" />
              </button>
              <button onClick={() => forwards.refetch()} className="rounded border border-[#0f223d] bg-[#081223] p-2 text-slate-300" title="Refresh port forwards">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {rows.map((item) => (
              <button
                key={item.id}
                onClick={() => selectForward(item)}
                className={`w-full rounded-lg border p-3 text-left transition ${selected?.id === item.id ? "border-blue-500/50 bg-blue-600/20" : "border-[#0f223d] bg-[#081223] hover:bg-[#0c2041]"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-white">{item.name}</div>
                    <div className="mt-1 text-xs uppercase text-blue-300">{item.incoming_zone || "WAN"} → {item.forward_zone || "DMZ"}</div>
                  </div>
                  <StatusPill status={item.enabled ? "Online" : "Offline"} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>{item.protocol.toUpperCase()} {item.external_port}</span>
                  <span>{item.internal_ip}{item.internal_port ? `:${item.internal_port}` : ""}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{item.source_address || "any source"} · {item.comment || "no comment"}</div>
              </button>
            ))}
            {!rows.length ? <div className="rounded-lg border border-[#0f223d] bg-[#081223] p-4 text-sm text-slate-400">No port forward rules configured yet. Use the plus button to add one.</div> : null}
          </div>
        </div>

        <div className="rounded-lg border border-[#0d274c] bg-[#020813] p-5 shadow-glow">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#0f223d] pb-4">
            <div>
              <div className="text-xs font-semibold uppercase text-blue-400">{selected ? "Port Forward Rule" : "New Port Forward Rule"}</div>
              <h2 className="mt-1 text-2xl font-black text-white">{selected?.name || "Port Forward"}</h2>
              <div className="mt-1 text-xs text-slate-400">{form.protocol.toUpperCase()} · {form.external_port || "port required"} → {form.internal_ip || "server required"}</div>
              {applyMutation.data ? <div className="mt-2 text-xs text-emerald-300">System apply: {applyMutation.data.status} · {applyMutation.data.message}</div> : null}
              {applyMutation.isError ? <div className="mt-2 text-xs text-red-300">System apply failed. Check gateway job logs.</div> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {selected ? (
                <button onClick={() => deleteMutation.mutate(selected.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300">
                  Delete
                </button>
              ) : null}
              <button disabled={saveDisabled} onClick={() => saveMutation.mutate({ id: selected?.id, payload: form })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                Save Rule
              </button>
              <button disabled={applyMutation.isPending} onClick={() => applyMutation.mutate()} className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 disabled:opacity-60">
                Apply to System
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <ReferencePanel title="Control">
                <div className="grid gap-3 md:grid-cols-2">
                  <NetworkSelect label="Enable" value={form.enabled ? "enable" : "disable"} onChange={(value) => setForm((current) => ({ ...current, enabled: value === "enable" }))} options={[["enable", "Enable"], ["disable", "Disable"]]} />
                  <NetworkInput label="Rule Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
                  <NetworkSelect label="Time Restriction" value={form.time_restriction} onChange={(value) => setForm((current) => ({ ...current, time_restriction: value }))} options={[["disable", "Disable"], ["always", "Always"], ["business_hours", "Business Hours"], ["custom", "Custom"]]} />
                  <NetworkSelect label="Connections per Second" value={form.connections_per_second} onChange={(value) => setForm((current) => ({ ...current, connections_per_second: value }))} options={[["no_limit", "No Limit"], ["10", "10"], ["50", "50"], ["100", "100"], ["custom", "Custom"]]} />
                </div>
              </ReferencePanel>

              <ReferencePanel title="Protocol">
                <div className="grid gap-3 md:grid-cols-2">
                  <NetworkSelect label="Action" value={form.action} onChange={(value) => setForm((current) => ({ ...current, action: value }))} options={[["forward", "FORWARD"]]} />
                  <NetworkSelect label="Protocol" value={form.protocol} onChange={(value) => setForm((current) => ({ ...current, protocol: value }))} options={[["tcp", "TCP"], ["udp", "UDP"]]} />
                  <NetworkSelect label="Log" value={form.log ? "enable" : "disable"} onChange={(value) => setForm((current) => ({ ...current, log: value === "enable" }))} options={[["disable", "Disable"], ["enable", "Enable"]]} />
                  <NetworkInput label="Comment" value={form.comment ?? ""} onChange={(value) => setForm((current) => ({ ...current, comment: value }))} />
                </div>
              </ReferencePanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <ReferencePanel title="Incoming Connection">
                <div className="grid gap-3 md:grid-cols-2">
                  <NetworkSelect label="Zone" value={form.incoming_zone ?? ""} onChange={(value) => setForm((current) => ({ ...current, incoming_zone: value }))} options={zoneOptions} />
                  <NetworkInput label="Original Service / Port" value={form.external_port} onChange={(value) => setForm((current) => ({ ...current, external_port: value }))} />
                  <NetworkInput label="Original Destination" value={form.original_destination ?? "any"} onChange={(value) => setForm((current) => ({ ...current, original_destination: value }))} />
                  <NetworkInput label="Exclude Original Destination" value={form.exclude_original_destination ?? "none"} onChange={(value) => setForm((current) => ({ ...current, exclude_original_destination: value }))} />
                </div>
              </ReferencePanel>

              <ReferencePanel title="Forward Address">
                <div className="grid gap-3 md:grid-cols-2">
                  <NetworkSelect label="Zone" value={form.forward_zone ?? ""} onChange={(value) => setForm((current) => ({ ...current, forward_zone: value }))} options={zoneOptions} />
                  <NetworkSelect label="Server Type" value={form.server_type} onChange={(value) => setForm((current) => ({ ...current, server_type: value }))} options={[["single_server", "Single Server"], ["server_pool", "Server Pool"]]} />
                  <NetworkInput label="Server IP" value={form.internal_ip} onChange={(value) => setForm((current) => ({ ...current, internal_ip: value }))} />
                  <NetworkInput label="Forward Service / Port" value={form.internal_port} onChange={(value) => setForm((current) => ({ ...current, internal_port: value }))} />
                  <NetworkSelect label="Forward Port Mode" value={form.forward_port_mode} onChange={(value) => setForm((current) => ({ ...current, forward_port_mode: value }))} options={[["original_port", "Original Port"], ["custom_port", "Custom Port"]]} />
                  <NetworkSelect label="Hairpin SNAT Interface" value={form.hairpin_snat_interface ?? "disable"} onChange={(value) => setForm((current) => ({ ...current, hairpin_snat_interface: value }))} options={interfaceOptions} />
                </div>
              </ReferencePanel>
            </div>

            <ReferencePanel title="Source Qualifier">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <NetworkInput label="Source Address" value={form.source_address ?? "any"} onChange={(value) => setForm((current) => ({ ...current, source_address: value }))} />
                <NetworkInput label="Exclude Source Address" value={form.exclude_source_address ?? "none"} onChange={(value) => setForm((current) => ({ ...current, exclude_source_address: value }))} />
                <NetworkInput label="Ports" value={form.source_ports ?? "any"} onChange={(value) => setForm((current) => ({ ...current, source_ports: value }))} />
                <NetworkSelect label="Interface" value={form.source_interface ?? "any"} onChange={(value) => setForm((current) => ({ ...current, source_interface: value }))} options={interfaceOptions} />
              </div>
            </ReferencePanel>
          </div>
        </div>
      </section>
    </div>
  );
}

function ToolbarButton({ icon, label, onClick, disabled, danger }: { icon: ReactNode; label: string; onClick?: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-md border border-[#0f223d] bg-[#081223] px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? "text-red-300 hover:bg-red-500/10" : "text-slate-300 hover:bg-[#0c2041]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function DhcpDnsPage() {
  const queryClient = useQueryClient();
  const interfaces = useQuery<NetworkInterfaceItem[]>({ queryKey: ["/network/interfaces"], queryFn: () => getList<NetworkInterfaceItem[]>("/network/interfaces") });
  const scopes = useQuery<DhcpScopeItem[]>({ queryKey: ["/network/dhcp-scopes"], queryFn: () => getList<DhcpScopeItem[]>("/network/dhcp-scopes") });
  const dnsSettings = useQuery<DnsSettingItem[]>({ queryKey: ["/network/dns"], queryFn: () => getList<DnsSettingItem[]>("/network/dns") });
  const interfaceRows = interfaces.data ?? [];
  const scopeRows = scopes.data ?? [];
  const dnsRows = dnsSettings.data ?? [];
  const [selectedScope, setSelectedScope] = useState<DhcpScopeItem | null>(null);
  const [selectedDns, setSelectedDns] = useState<DnsSettingItem | null>(null);
  const [scopeForm, setScopeForm] = useState<DhcpScopeForm>(() => ({ ...defaultDhcpScopeForm, interface_id: interfaceRows[0]?.id ?? 0 }));
  const [dnsForm, setDnsForm] = useState<DnsSettingForm>(defaultDnsSettingForm);

  useEffect(() => {
    if (!scopeForm.interface_id && interfaceRows[0]?.id) {
      setScopeForm((current) => ({ ...current, interface_id: interfaceRows[0].id }));
    }
  }, [interfaceRows[0]?.id]);

  const interfaceOptions: Array<[string, string]> = [["", "Required"], ...interfaceRows.map((item) => [String(item.id), `${item.name} (${item.role.toUpperCase()})`] as [string, string])];

  const resetScope = () => {
    setSelectedScope(null);
    setScopeForm({ ...defaultDhcpScopeForm, interface_id: interfaceRows[0]?.id ?? 0 });
  };

  const resetDns = () => {
    setSelectedDns(null);
    setDnsForm(defaultDnsSettingForm);
  };

  const selectScope = (scope: DhcpScopeItem) => {
    setSelectedScope(scope);
    setScopeForm({
      interface_id: scope.interface_id,
      scope_name: scope.scope_name,
      enabled: scope.enabled,
      start_ip: scope.start_ip,
      end_ip: scope.end_ip,
      subnet_mask: scope.subnet_mask ?? "",
      gateway: scope.gateway ?? "",
      dns_primary: scope.dns_primary ?? "",
      dns_secondary: scope.dns_secondary ?? "",
      domain_name: scope.domain_name ?? "",
      lease_minutes: scope.lease_minutes,
      options: scope.options ?? {},
    });
  };

  const selectDns = (dns: DnsSettingItem) => {
    setSelectedDns(dns);
    setDnsForm({
      enabled: dns.enabled,
      resolver_name: dns.resolver_name,
      primary_dns: dns.primary_dns,
      secondary_dns: dns.secondary_dns ?? "",
      search_domain: dns.search_domain ?? "",
      cache_size: dns.cache_size,
      local_ttl: dns.local_ttl,
    });
  };

  const saveScopeMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: DhcpScopeForm }) =>
      id ? updateRecord<DhcpScopeItem>(`/network/dhcp-scopes/${id}`, payload) : createRecord<DhcpScopeItem>("/network/dhcp-scopes", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/network/dhcp-scopes"] });
      resetScope();
    },
  });

  const deleteScopeMutation = useMutation({
    mutationFn: (id: number) => deleteRecord(`/network/dhcp-scopes/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/network/dhcp-scopes"] });
      resetScope();
    },
  });

  const saveDnsMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: DnsSettingForm }) =>
      id ? updateRecord<DnsSettingItem>(`/network/dns/${id}`, payload) : createRecord<DnsSettingItem>("/network/dns", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/network/dns"] });
      resetDns();
    },
  });

  const deleteDnsMutation = useMutation({
    mutationFn: (id: number) => deleteRecord(`/network/dns/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/network/dns"] });
      resetDns();
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => createRecord<{ status: string; message: string }>("/network/apply", { dry_run: false, execute: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/gateway/jobs"] });
    },
  });

  const selectedInterfaceName = (id: number) => interfaceRows.find((item) => item.id === id)?.name ?? `#${id}`;
  const scopeSaveDisabled = saveScopeMutation.isPending || !scopeForm.interface_id || !scopeForm.scope_name || !scopeForm.start_ip || !scopeForm.end_ip;
  const dnsSaveDisabled = saveDnsMutation.isPending || !dnsForm.resolver_name || !dnsForm.primary_dns;

  return (
    <div className="space-y-3">
      <section className="grid gap-3 md:grid-cols-4">
        <MetricTile label="DHCP Scopes" value={scopeRows.length} tone="blue" />
        <MetricTile label="Enabled Scopes" value={scopeRows.filter((item) => item.enabled).length} tone="green" />
        <MetricTile label="Resolvers" value={dnsRows.length} tone="cyan" />
        <MetricTile label="LAN Interfaces" value={interfaceRows.filter((item) => item.role === "lan").length} tone="amber" />
      </section>

      <section className="grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="rounded-lg border border-[#0d274c] bg-[#020813] p-4 shadow-glow">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h1 className="text-sm font-semibold uppercase text-slate-200">DHCP Scopes</h1>
                <p className="text-xs text-slate-500">Address pools served by dnsmasq.</p>
              </div>
              <button onClick={resetScope} className="rounded border border-[#0f223d] bg-[#081223] p-2 text-slate-300" title="Add DHCP scope">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {scopeRows.map((scope) => (
                <button
                  key={scope.id}
                  onClick={() => selectScope(scope)}
                  className={`w-full rounded-lg border p-3 text-left transition ${selectedScope?.id === scope.id ? "border-blue-500/50 bg-blue-600/20" : "border-[#0f223d] bg-[#081223] hover:bg-[#0c2041]"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-bold text-white">{scope.scope_name}</div>
                      <div className="mt-1 text-xs uppercase text-blue-300">{selectedInterfaceName(scope.interface_id)}</div>
                    </div>
                    <StatusPill status={scope.enabled ? "Online" : "Offline"} />
                  </div>
                  <div className="mt-2 text-xs text-slate-400">{scope.start_ip} - {scope.end_ip}</div>
                  <div className="mt-1 text-xs text-slate-500">Lease {scope.lease_minutes} min · GW {scope.gateway || "auto"}</div>
                </button>
              ))}
              {!scopeRows.length ? <div className="rounded-lg border border-[#0f223d] bg-[#081223] p-4 text-sm text-slate-400">No DHCP scopes configured yet.</div> : null}
            </div>
          </div>

          <div className="rounded-lg border border-[#0d274c] bg-[#020813] p-4 shadow-glow">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase text-slate-200">DNS Resolvers</h2>
                <p className="text-xs text-slate-500">Upstream DNS and local cache settings.</p>
              </div>
              <button onClick={resetDns} className="rounded border border-[#0f223d] bg-[#081223] p-2 text-slate-300" title="Add resolver">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {dnsRows.map((dns) => (
                <button
                  key={dns.id}
                  onClick={() => selectDns(dns)}
                  className={`w-full rounded-lg border p-3 text-left transition ${selectedDns?.id === dns.id ? "border-blue-500/50 bg-blue-600/20" : "border-[#0f223d] bg-[#081223] hover:bg-[#0c2041]"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-white">{dns.resolver_name}</div>
                    <StatusPill status={dns.enabled ? "Online" : "Offline"} />
                  </div>
                  <div className="mt-2 text-xs text-slate-400">{dns.primary_dns}{dns.secondary_dns ? ` / ${dns.secondary_dns}` : ""}</div>
                  <div className="mt-1 text-xs text-slate-500">{dns.search_domain || "No search domain"} · cache {dns.cache_size}</div>
                </button>
              ))}
              {!dnsRows.length ? <div className="rounded-lg border border-[#0f223d] bg-[#081223] p-4 text-sm text-slate-400">No DNS resolvers configured yet.</div> : null}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#0d274c] bg-[#020813] p-5 shadow-glow">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#0f223d] pb-4">
            <div>
              <div className="text-xs font-semibold uppercase text-blue-400">DHCP & DNS</div>
              <h2 className="mt-1 text-2xl font-black text-white">dnsmasq Control</h2>
              <div className="mt-1 text-xs text-slate-400">Generate DHCP pools and resolver config from database records.</div>
              {applyMutation.data ? <div className="mt-2 text-xs text-emerald-300">System apply: {applyMutation.data.status} · {applyMutation.data.message}</div> : null}
              {applyMutation.isError ? <div className="mt-2 text-xs text-red-300">System apply failed. Check gateway job logs.</div> : null}
            </div>
            <button disabled={applyMutation.isPending} onClick={() => applyMutation.mutate()} className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 disabled:opacity-60">
              Apply to System
            </button>
          </div>

          <div className="space-y-4">
            <ReferencePanel title={selectedScope ? "DHCP Scope: Modify" : "DHCP Scope: New"}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <NetworkSelect label="Enable" value={scopeForm.enabled ? "enable" : "disable"} onChange={(value) => setScopeForm((current) => ({ ...current, enabled: value === "enable" }))} options={[["enable", "Enable"], ["disable", "Disable"]]} />
                <NetworkSelect label="Interface" value={String(scopeForm.interface_id || "")} onChange={(value) => setScopeForm((current) => ({ ...current, interface_id: Number(value) }))} options={interfaceOptions} />
                <NetworkInput label="Scope Name" value={scopeForm.scope_name} onChange={(value) => setScopeForm((current) => ({ ...current, scope_name: value }))} />
                <NetworkInput label="Lease Minutes" value={String(scopeForm.lease_minutes)} onChange={(value) => setScopeForm((current) => ({ ...current, lease_minutes: Number(value || 720) }))} />
                <NetworkInput label="Start IP" value={scopeForm.start_ip} onChange={(value) => setScopeForm((current) => ({ ...current, start_ip: value }))} />
                <NetworkInput label="End IP" value={scopeForm.end_ip} onChange={(value) => setScopeForm((current) => ({ ...current, end_ip: value }))} />
                <NetworkInput label="Subnet Mask" value={scopeForm.subnet_mask ?? ""} onChange={(value) => setScopeForm((current) => ({ ...current, subnet_mask: value }))} />
                <NetworkInput label="Gateway" value={scopeForm.gateway ?? ""} onChange={(value) => setScopeForm((current) => ({ ...current, gateway: value }))} />
                <NetworkInput label="DNS Primary" value={scopeForm.dns_primary ?? ""} onChange={(value) => setScopeForm((current) => ({ ...current, dns_primary: value }))} />
                <NetworkInput label="DNS Secondary" value={scopeForm.dns_secondary ?? ""} onChange={(value) => setScopeForm((current) => ({ ...current, dns_secondary: value }))} />
                <NetworkInput label="Domain Name" value={scopeForm.domain_name ?? ""} onChange={(value) => setScopeForm((current) => ({ ...current, domain_name: value }))} />
              </div>
              <div className="mt-4 flex gap-2">
                {selectedScope ? <button onClick={() => deleteScopeMutation.mutate(selectedScope.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300">Delete Scope</button> : null}
                <button disabled={scopeSaveDisabled} onClick={() => saveScopeMutation.mutate({ id: selectedScope?.id, payload: scopeForm })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">Save Scope</button>
                <button onClick={resetScope} className="rounded-lg border border-[#0f223d] bg-[#081223] px-4 py-2 text-sm font-semibold text-slate-300">Cancel</button>
              </div>
            </ReferencePanel>

            <ReferencePanel title={selectedDns ? "DNS Resolver: Modify" : "DNS Resolver: New"}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <NetworkSelect label="Enable" value={dnsForm.enabled ? "enable" : "disable"} onChange={(value) => setDnsForm((current) => ({ ...current, enabled: value === "enable" }))} options={[["enable", "Enable"], ["disable", "Disable"]]} />
                <NetworkInput label="Resolver Name" value={dnsForm.resolver_name} onChange={(value) => setDnsForm((current) => ({ ...current, resolver_name: value }))} />
                <NetworkInput label="Primary DNS" value={dnsForm.primary_dns} onChange={(value) => setDnsForm((current) => ({ ...current, primary_dns: value }))} />
                <NetworkInput label="Secondary DNS" value={dnsForm.secondary_dns ?? ""} onChange={(value) => setDnsForm((current) => ({ ...current, secondary_dns: value }))} />
                <NetworkInput label="Search Domain" value={dnsForm.search_domain ?? ""} onChange={(value) => setDnsForm((current) => ({ ...current, search_domain: value }))} />
                <NetworkInput label="Cache Size" value={String(dnsForm.cache_size)} onChange={(value) => setDnsForm((current) => ({ ...current, cache_size: Number(value || 0) }))} />
                <NetworkInput label="Local TTL" value={String(dnsForm.local_ttl)} onChange={(value) => setDnsForm((current) => ({ ...current, local_ttl: Number(value || 0) }))} />
              </div>
              <div className="mt-4 flex gap-2">
                {selectedDns ? <button onClick={() => deleteDnsMutation.mutate(selectedDns.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300">Delete DNS</button> : null}
                <button disabled={dnsSaveDisabled} onClick={() => saveDnsMutation.mutate({ id: selectedDns?.id, payload: dnsForm })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">Save DNS</button>
                <button onClick={resetDns} className="rounded-lg border border-[#0f223d] bg-[#081223] px-4 py-2 text-sm font-semibold text-slate-300">Cancel</button>
              </div>
            </ReferencePanel>
          </div>
        </div>
      </section>
    </div>
  );
}

function DynamicDnsPage() {
  const queryClient = useQueryClient();
  const interfaces = useQuery<NetworkInterfaceItem[]>({ queryKey: ["/network/interfaces"], queryFn: () => getList<NetworkInterfaceItem[]>("/network/interfaces") });
  const profiles = useQuery<DynamicDnsProfileItem[]>({ queryKey: ["/network/dyndns"], queryFn: () => getList<DynamicDnsProfileItem[]>("/network/dyndns") });
  const rows = profiles.data ?? [];
  const interfaceRows = interfaces.data ?? [];
  const [selectedProfile, setSelectedProfile] = useState<DynamicDnsProfileItem | null>(null);
  const [form, setForm] = useState<DynamicDnsProfileForm>(defaultDynamicDnsProfileForm);

  const resetForm = () => {
    setSelectedProfile(null);
    setForm(defaultDynamicDnsProfileForm);
  };

  const patchForm = <K extends keyof DynamicDnsProfileForm>(key: K, value: DynamicDnsProfileForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectProfile = (profile: DynamicDnsProfileItem) => {
    setSelectedProfile(profile);
    setForm({
      profile_name: profile.profile_name,
      enabled: profile.enabled,
      provider: profile.provider,
      protocol: profile.protocol,
      server: profile.server ?? "",
      hostnames: profile.hostnames,
      username: profile.username,
      password: profile.password,
      interface_name: profile.interface_name ?? "",
      use_ssl: profile.use_ssl,
      check_url: profile.check_url ?? "",
      update_interval_minutes: profile.update_interval_minutes,
      force_update_days: profile.force_update_days,
      status: profile.status,
    });
  };

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: DynamicDnsProfileForm }) =>
      id ? updateRecord<DynamicDnsProfileItem>(`/network/dyndns/${id}`, payload) : createRecord<DynamicDnsProfileItem>("/network/dyndns", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/network/dyndns"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRecord(`/network/dyndns/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/network/dyndns"] });
      resetForm();
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => createRecord<{ status: string; message: string; rendered_configs?: Array<{ content: string }> }>("/network/dyndns/apply", { dry_run: true, execute: false }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/gateway/jobs"] });
    },
  });

  const interfaceOptions: Array<[string, string]> = [["", "Auto / Web Check"], ...interfaceRows.map((item) => [item.name, `${item.name} (${item.role.toUpperCase()})`] as [string, string])];
  const saveDisabled = saveMutation.isPending || !form.profile_name || !form.hostnames || !form.username || !form.password;

  return (
    <div className="space-y-3">
      <section className="grid gap-3 md:grid-cols-4">
        <MetricTile label="Profiles" value={rows.length} tone="blue" />
        <MetricTile label="Enabled" value={rows.filter((item) => item.enabled && item.status === "active").length} tone="green" />
        <MetricTile label="Providers" value={new Set(rows.map((item) => item.provider)).size} tone="cyan" />
        <MetricTile label="WAN Sources" value={rows.filter((item) => item.interface_name).length || "Auto"} tone="amber" />
      </section>

      <section className="grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-lg border border-[#0d274c] bg-[#020813] p-4 shadow-glow">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-sm font-semibold uppercase text-slate-200">DynDNS Profiles</h1>
              <p className="text-xs text-slate-500">Profiles used to generate ddclient configuration.</p>
            </div>
            <button onClick={resetForm} className="rounded border border-[#0f223d] bg-[#081223] p-2 text-slate-300" title="Add DynDNS profile">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {rows.map((profile) => (
              <button
                key={profile.id}
                onClick={() => selectProfile(profile)}
                className={`w-full rounded-lg border p-3 text-left transition ${selectedProfile?.id === profile.id ? "border-blue-500/50 bg-blue-600/20" : "border-[#0f223d] bg-[#081223] hover:bg-[#0c2041]"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-white">{profile.profile_name}</div>
                    <div className="mt-1 text-xs uppercase text-blue-300">{profile.provider} · {profile.protocol}</div>
                  </div>
                  <StatusPill status={profile.enabled && profile.status === "active" ? "Online" : "Disabled"} />
                </div>
                <div className="mt-2 truncate text-xs text-slate-400">{profile.hostnames}</div>
                <div className="mt-1 text-xs text-slate-500">Source {profile.interface_name || "web check"} · every {profile.update_interval_minutes} min</div>
              </button>
            ))}
            {!rows.length ? <div className="rounded-lg border border-[#0f223d] bg-[#081223] p-4 text-sm text-slate-400">No DynDNS profiles configured yet.</div> : null}
          </div>
        </div>

        <div className="space-y-3">
          <ReferencePanel title={selectedProfile ? "Edit DynDNS Profile" : "New DynDNS Profile"}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <NetworkSelect label="Enable" value={String(form.enabled)} onChange={(value) => patchForm("enabled", value === "true")} options={[["true", "Enable"], ["false", "Disable"]]} />
              <NetworkInput label="Profile Name" value={form.profile_name} onChange={(value) => patchForm("profile_name", value)} />
              <NetworkSelect label="Provider" value={form.provider} onChange={(value) => patchForm("provider", value)} options={[["custom", "Custom"], ["cloudflare", "Cloudflare"], ["noip", "No-IP"], ["duckdns", "DuckDNS"], ["dyndns", "DynDNS"], ["namecheap", "Namecheap"]]} />
              <NetworkSelect label="Protocol" value={form.protocol} onChange={(value) => patchForm("protocol", value)} options={[["dyndns2", "dyndns2"], ["cloudflare", "cloudflare"], ["duckdns", "duckdns"], ["namecheap", "namecheap"], ["googledomains", "Google Domains"]]} />
              <NetworkInput label="Server" value={form.server ?? ""} onChange={(value) => patchForm("server", value)} />
              <NetworkInput label="Hostnames" value={form.hostnames} onChange={(value) => patchForm("hostnames", value)} />
              <NetworkInput label="Username / Login" value={form.username} onChange={(value) => patchForm("username", value)} />
              <NetworkInput label="Password / Token" value={form.password} onChange={(value) => patchForm("password", value)} />
              <NetworkSelect label="WAN Interface" value={form.interface_name ?? ""} onChange={(value) => patchForm("interface_name", value)} options={interfaceOptions} />
              <NetworkSelect label="SSL" value={String(form.use_ssl)} onChange={(value) => patchForm("use_ssl", value === "true")} options={[["true", "Enable"], ["false", "Disable"]]} />
              <NetworkInput label="Public IP Check URL" value={form.check_url ?? ""} onChange={(value) => patchForm("check_url", value)} />
              <NetworkInput label="Update Interval Minutes" value={String(form.update_interval_minutes)} onChange={(value) => patchForm("update_interval_minutes", Number(value.replace(/[^\d]/g, "") || 1))} />
              <NetworkInput label="Force Update Days" value={form.force_update_days == null ? "" : String(form.force_update_days)} onChange={(value) => patchForm("force_update_days", value ? Number(value.replace(/[^\d]/g, "") || 1) : null)} />
              <NetworkSelect label="Status" value={form.status} onChange={(value) => patchForm("status", value as DynamicDnsProfileForm["status"])} options={[["active", "Active"], ["disabled", "Disabled"], ["draft", "Draft"]]} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ToolbarButton icon={<FileCheck className="h-4 w-4" />} label={selectedProfile ? "Update Profile" : "Save Profile"} onClick={() => saveMutation.mutate({ id: selectedProfile?.id, payload: form })} disabled={saveDisabled} />
              <ToolbarButton icon={<RefreshCw className="h-4 w-4" />} label="Build ddclient Plan" onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending} />
              {selectedProfile ? <ToolbarButton icon={<AlertTriangle className="h-4 w-4" />} label="Delete" onClick={() => deleteMutation.mutate(selectedProfile.id)} danger /> : null}
            </div>
          </ReferencePanel>

          <ReferencePanel title="ddclient Preview">
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-[#0f223d] bg-[#081223] p-4 text-xs leading-5 text-slate-300">
              {applyMutation.data?.rendered_configs?.[0]?.content ?? "Use Build ddclient Plan to preview the generated configuration. Live apply will be tested when the server is available."}
            </pre>
            {applyMutation.data?.message ? <div className="mt-3 text-sm text-blue-300">{applyMutation.data.message}</div> : null}
          </ReferencePanel>
        </div>
      </section>
    </div>
  );
}

function UsersPage() {
  const users = useQuery<UserItem[]>({ queryKey: ["/users"], queryFn: () => getList<UserItem[]>("/users") });
  const mockUsers = [
    { id: 1, name: "John Smith", username: "johnsmith", email: "john.smith@email.com", phone: "+1 555 123 4567", plan: "Premium 50Mbps", status: "Online", usage: { used: 12.45, total: 50 }, sessions: 1, ip: "192.168.10.23", lastSeen: "10:42:10 AM, May 20, 2025" },
    { id: 2, name: "Maria Garcia", username: "mariagarcia", email: "maria.garcia@email.com", phone: "+1 555 987 6543", plan: "Standard 20Mbps", status: "Online", usage: { used: 5.23, total: 20 }, sessions: 1, ip: "192.168.10.24", lastSeen: "10:41:55 AM, May 20, 2025" },
    { id: 3, name: "David Wilson", username: "dwilson", email: "david.wilson@email.com", phone: "+1 555 456 7890", plan: "Basic 10Mbps", status: "Online", usage: { used: 1.12, total: 10 }, sessions: 1, ip: "192.168.10.25", lastSeen: "10:41:32 AM, May 20, 2025" },
    { id: 4, name: "Sarah Johnson", username: "sarahj", email: "sarah.johnson@email.com", phone: "+1 555 321 0987", plan: "Premium 50Mbps", status: "Offline", usage: { used: 8.75, total: 50 }, sessions: 0, ip: "-", lastSeen: "9:18:44 AM, May 20, 2025" },
    { id: 5, name: "Michael Brown", username: "mbrown", email: "michael.brown@email.com", phone: "+1 555 654 3210", plan: "Standard 20Mbps", status: "Expired", usage: { used: 20, total: 20 }, sessions: 0, ip: "-", lastSeen: "Yesterday, 11:23:10 PM" },
    { id: 6, name: "Emily Davis", username: "edavis", email: "emily.davis@email.com", phone: "+1 555 789 0123", plan: "Basic 10Mbps", status: "Disabled", usage: { used: 0, total: 10 }, sessions: 0, ip: "-", lastSeen: "-" },
    { id: 7, name: "Robert Martinez", username: "rmartinez", email: "robert.martinez@email.com", phone: "+1 555 147 2580", plan: "Premium 50Mbps", status: "Online", usage: { used: 18.34, total: 50 }, sessions: 2, ip: "192.168.10.26", lastSeen: "10:42:01 AM, May 20, 2025" },
    { id: 8, name: "Lisa Anderson", username: "landerson", email: "lisa.anderson@email.com", phone: "+1 555 369 8520", plan: "Standard 20Mbps", status: "Online", usage: { used: 3.66, total: 20 }, sessions: 1, ip: "192.168.10.27", lastSeen: "10:41:12 AM, May 20, 2025" },
  ];
  const rows = users.data?.length ? users.data.map((user) => ({
    id: user.id,
    name: user.full_name || user.username,
    username: user.username,
    email: user.email,
    phone: "—",
    plan: user.current_plan_name ?? "Unassigned",
    status: user.is_active ? "Online" : "Disabled",
    usage: { used: 0, total: 100 },
    sessions: user.is_admin ? 1 : 0,
    ip: "—",
    lastSeen: user.is_active ? "Just now" : "Unknown",
  })) : mockUsers;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [planFilter, setPlanFilter] = useState("All");
  const filtered = rows.filter((user) => {
    const text = `${user.name} ${user.username} ${user.email} ${user.phone} ${user.ip}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || user.status === statusFilter;
    const matchesPlan = planFilter === "All" || user.plan.toLowerCase().includes(planFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesPlan;
  });
  const totalUsers = rows.length;
  const activeUsers = rows.filter((user) => user.status === "Online").length;
  const disabledUsers = rows.filter((user) => user.status === "Disabled").length;
  const expiredUsers = rows.filter((user) => user.status === "Expired").length;
  const onlineNow = rows.filter((user) => user.status === "Online").length;

  return (
    <div className="space-y-6 animate-fadeIn">
      <section className="grid gap-4 xl:grid-cols-5">
        <MetricTile label="Total Users" value={totalUsers.toLocaleString()} tone="blue" delta="▲ 12.3% vs last month" />
        <MetricTile label="Active Users" value={activeUsers.toLocaleString()} tone="green" delta="▲ 8.7% vs last month" />
        <MetricTile label="Disabled Users" value={disabledUsers.toLocaleString()} tone="red" delta="▼ 4.2% vs last month" />
        <MetricTile label="Expired Users" value={expiredUsers.toLocaleString()} tone="amber" delta="▼ 11.3% vs last month" />
        <MetricTile label="Online Now" value={onlineNow.toLocaleString()} tone="cyan" delta="Active hotspot sessions" highlight />
      </section>

      <section className="glass-panel flex flex-col gap-4 rounded-xl border border-[#0d274c] p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-[280px] flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users by name, email, phone, IP or MAC..." className="w-full rounded-lg border border-[#0f223d] bg-slate-950 px-9 py-2 text-xs text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500" />
          </div>
          <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={["All", "Online", "Offline", "Expired", "Disabled"]} />
          <FilterSelect label="Plan" value={planFilter} onChange={setPlanFilter} options={["All", "Premium", "Standard", "Basic"]} />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/10 transition hover:bg-blue-500"><Plus className="h-3.5 w-3.5" /> Add User</button>
          <button className="rounded-lg border border-[#0f223d] bg-[#081223] px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-[#0c2041]">Import Users</button>
          <button className="rounded-lg border border-[#0f223d] bg-[#081223] px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-[#0c2041]">Export</button>
        </div>
      </section>

      <section className="glass-panel overflow-hidden rounded-xl border border-[#0d274c]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#0f223d] bg-slate-900/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="p-4">User</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Status</th>
                <th className="p-4">Quota Usage</th>
                <th className="p-4">Sessions</th>
                <th className="p-4">IP Address</th>
                <th className="p-4">Last Seen</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0f223d] text-xs">
              {filtered.map((user) => {
                const pct = Math.min((user.usage.used / Math.max(user.usage.total, 1)) * 100, 100);
                return (
                  <tr key={user.id} className="transition hover:bg-slate-900/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-900/30 bg-blue-500/10 font-semibold text-blue-300">
                          {user.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white">{user.name}</div>
                          <div className="text-[10px] text-slate-500">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-300"><div>{user.email}</div><div className="text-[10px] text-slate-500">{user.phone}</div></td>
                    <td className="p-4"><span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${user.plan.includes("Premium") ? "border-blue-500/20 bg-blue-500/10 text-blue-400" : user.plan.includes("Standard") ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-400" : "border-slate-700 bg-slate-800 text-slate-400"}`}>{user.plan}</span></td>
                    <td className="p-4"><StatusPill status={user.status} /></td>
                    <td className="p-4">
                      <div className="w-28">
                        <div className="mb-1 flex justify-between text-[9px] text-slate-400"><span>{user.usage.used.toFixed(2)} GB</span><span>{user.usage.total} GB</span></div>
                        <div className="h-1 rounded-full bg-slate-950"><div className={`h-1 rounded-full ${pct >= 100 ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} /></div>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-300">{user.sessions}</td>
                    <td className="p-4 font-bold text-slate-400">{user.ip}</td>
                    <td className="p-4 text-[10px] text-slate-500">{user.lastSeen}</td>
                    <td className="p-4 text-center"><button className="rounded bg-[#081223] px-2 py-1 text-[10px] font-bold text-blue-400 transition hover:bg-[#0c2041]">Manage</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#0f223d] bg-slate-900/20 p-4 text-xs text-slate-400">
          <p>Showing 1 to {filtered.length} of {filtered.length} entries</p>
          <div className="flex gap-1.5">
            <button className="cursor-not-allowed rounded border border-[#0f223d] bg-[#081223] px-2.5 py-1 text-[10px] font-semibold text-slate-500">Previous</button>
            <button className="rounded border border-blue-500/20 bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white">1</button>
            <button className="cursor-not-allowed rounded border border-[#0f223d] bg-[#081223] px-2.5 py-1 text-[10px] font-semibold text-slate-500">Next</button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="glass-panel rounded-xl border border-[#0d274c] p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-300">Status Distribution</h3>
          <div className="flex items-center justify-around gap-4">
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-[8px] border-slate-950 font-mono">
              <div className="absolute inset-0 rounded-full border-[8px] border-emerald-500 border-b-transparent border-l-transparent" />
              <div className="text-center">
                <span className="block text-lg font-extrabold text-white">{totalUsers.toLocaleString()}</span>
                <span className="block text-[8px] uppercase text-slate-500">Total</span>
              </div>
            </div>
            <div className="space-y-1 text-[11px] font-mono text-slate-400">
              <StatusLegend color="emerald" label="Online" value={activeUsers} />
              <StatusLegend color="slate" label="Offline" value={Math.max(totalUsers - onlineNow - disabledUsers, 0)} />
              <StatusLegend color="amber" label="Expired" value={expiredUsers} />
              <StatusLegend color="red" label="Disabled" value={disabledUsers} />
            </div>
          </div>
        </div>
        <div className="glass-panel rounded-xl border border-[#0d274c] p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-300">Top User Groups</h3>
          <div className="space-y-3 text-[11px] text-slate-400">
            {[
              ["Guests", 632, "51%"],
              ["Staff Members", 342, "27%"],
              ["Students", 156, "12%"],
              ["VIP Access", 78, "6%"],
              ["Others", 40, "4%"],
            ].map(([label, count, pct]) => (
              <div key={String(label)} className="flex items-center justify-between border-b border-slate-950 pb-2 last:border-0 last:pb-0">
                <span className="text-slate-300">{label}</span>
                <strong className="text-white">{count as number} ({pct})</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel rounded-xl border border-[#0d274c] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Quick Actions</h3>
            <span className="rounded border border-blue-900/30 bg-[#081223] px-2 py-0.5 text-[10px] text-slate-400">This Month</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Add User", Plus],
              ["Import Users", Upload],
              ["User Groups", UsersIcon],
              ["Online Users", Wifi],
              ["Expired Users", AlertTriangle],
              ["Bulk Actions", Layers2],
            ].map(([label, Icon]) => (
              <button key={String(label)} className="rounded-2xl border border-[#0f223d] bg-[#081223] p-4 text-center transition hover:bg-[#0c2041]">
                <Icon className="mx-auto mb-2 h-5 w-5 text-blue-400" />
                <span className="text-[10px] font-bold text-slate-300">{label as string}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function PlansPage() {
  const queryClient = useQueryClient();
  const plans = useQuery<PlanItem[]>({ queryKey: ["/plans"], queryFn: () => getList<PlanItem[]>("/plans") });
  const defaultForm: PlanFormState = {
    plan_name: "",
    use_for_new_vouchers: "true",
    voucher_type: "login",
    random_user_id_string_type: "numeric",
    random_user_id_prefix: "date_of_month",
    password_type: "fixed",
    voucher_password: "pass123",
    currency_type: "INR",
    plan_charge: "",
    login_method: "default",
    mac_binding: "false",
    concurrent_sessions: "0",
    mobile_registration: "false",
    account_validity_type: "days_from_first_login",
    account_validity_days: "1",
    voucher_validity_days: "10",
    max_duration_minutes: "",
    max_data_mb: "",
    upload_limit_mode: "enforce_limit",
    upload_kbps: "",
    download_limit_mode: "enforce_limit",
    download_kbps: "",
    idle_timeout_minutes: "30",
    delete_inactive_accounts: "true",
    max_inactive_days: "30",
    status: "active",
  };
  const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);
  const [form, setForm] = useState<PlanFormState>(defaultForm);
  const updateForm = (key: keyof PlanFormState, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const numberOrNull = (value: string) => {
    const parsed = Number(value);
    return value === "" || Number.isNaN(parsed) ? null : parsed;
  };
  const payloadFromForm = () => ({
    plan_name: form.plan_name,
    download_kbps: form.download_limit_mode === "no_limit" ? 0 : Number(form.download_kbps || 0),
    upload_kbps: form.upload_limit_mode === "no_limit" ? 0 : Number(form.upload_kbps || 0),
    max_data_mb: form.max_data_mb === "" ? null : Number(form.max_data_mb),
    max_duration_minutes: form.max_duration_minutes === "" ? null : Number(form.max_duration_minutes),
    idle_timeout_minutes: numberOrNull(form.idle_timeout_minutes),
    concurrent_sessions: Number(form.concurrent_sessions || 0),
    status: form.status,
    use_for_new_vouchers: form.use_for_new_vouchers === "true",
    voucher_type: form.voucher_type,
    random_user_id_string_type: form.random_user_id_string_type,
    random_user_id_prefix: form.random_user_id_prefix,
    password_type: form.password_type,
    voucher_password: form.voucher_password || null,
    currency_type: form.currency_type,
    plan_charge: numberOrNull(form.plan_charge),
    login_method: form.login_method,
    mac_binding: form.mac_binding === "true",
    mobile_registration: form.mobile_registration === "true",
    account_validity_type: form.account_validity_type,
    account_validity_days: numberOrNull(form.account_validity_days),
    voucher_validity_days: numberOrNull(form.voucher_validity_days),
    upload_limit_mode: form.upload_limit_mode,
    download_limit_mode: form.download_limit_mode,
    delete_inactive_accounts: form.delete_inactive_accounts === "true",
    max_inactive_days: numberOrNull(form.max_inactive_days),
  });
  const createPlan = useMutation({
    mutationFn: () => createRecord<PlanItem>("/plans", payloadFromForm()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/plans"] });
      setSelectedPlan(null);
      setForm(defaultForm);
    },
  });
  const updatePlan = useMutation({
    mutationFn: () => updateRecord<PlanItem>(`/plans/${selectedPlan?.id ?? 0}`, payloadFromForm()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/plans"] });
      setSelectedPlan(null);
      setForm(defaultForm);
    },
  });
  const deletePlan = useMutation({
    mutationFn: (planId: number) => deleteRecord(`/plans/${planId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/plans"] });
    },
  });
  const editPlan = (plan: PlanItem) => {
    setSelectedPlan(plan);
    setForm({
      plan_name: plan.plan_name,
      use_for_new_vouchers: String(plan.use_for_new_vouchers) as "true" | "false",
      voucher_type: plan.voucher_type,
      random_user_id_string_type: plan.random_user_id_string_type,
      random_user_id_prefix: plan.random_user_id_prefix,
      password_type: plan.password_type,
      voucher_password: plan.voucher_password ?? "",
      currency_type: plan.currency_type,
      plan_charge: plan.plan_charge == null ? "" : String(plan.plan_charge),
      login_method: plan.login_method,
      mac_binding: String(plan.mac_binding) as "true" | "false",
      concurrent_sessions: String(plan.concurrent_sessions),
      mobile_registration: String(plan.mobile_registration) as "true" | "false",
      account_validity_type: plan.account_validity_type,
      account_validity_days: plan.account_validity_days == null ? "" : String(plan.account_validity_days),
      voucher_validity_days: plan.voucher_validity_days == null ? "" : String(plan.voucher_validity_days),
      max_duration_minutes: plan.max_duration_minutes == null ? "" : String(plan.max_duration_minutes),
      max_data_mb: plan.max_data_mb == null ? "" : String(plan.max_data_mb),
      upload_limit_mode: plan.upload_limit_mode,
      upload_kbps: String(plan.upload_kbps),
      download_limit_mode: plan.download_limit_mode,
      download_kbps: String(plan.download_kbps),
      idle_timeout_minutes: plan.idle_timeout_minutes == null ? "" : String(plan.idle_timeout_minutes),
      delete_inactive_accounts: String(plan.delete_inactive_accounts) as "true" | "false",
      max_inactive_days: plan.max_inactive_days == null ? "" : String(plan.max_inactive_days),
      status: plan.status,
    });
  };
  const rows =
    plans.data?.length
      ? plans.data
      : [
          { id: 1, plan_name: "Premium 50Mbps", download_kbps: 51200, upload_kbps: 10240, max_data_mb: null, max_duration_minutes: 4320, idle_timeout_minutes: 30, concurrent_sessions: 2, status: "active", use_for_new_vouchers: true, voucher_type: "login", random_user_id_string_type: "numeric", random_user_id_prefix: "date_of_month", password_type: "fixed", voucher_password: "pass123", currency_type: "INR", plan_charge: 499, login_method: "default", mac_binding: false, mobile_registration: false, account_validity_type: "days_from_first_login", account_validity_days: 3, voucher_validity_days: 10, upload_limit_mode: "enforce_limit", download_limit_mode: "enforce_limit", delete_inactive_accounts: true, max_inactive_days: 30 },
          { id: 2, plan_name: "Standard 20Mbps", download_kbps: 20480, upload_kbps: 5120, max_data_mb: null, max_duration_minutes: 2880, idle_timeout_minutes: 30, concurrent_sessions: 1, status: "active", use_for_new_vouchers: true, voucher_type: "login", random_user_id_string_type: "numeric", random_user_id_prefix: "date_of_month", password_type: "fixed", voucher_password: "pass123", currency_type: "INR", plan_charge: 249, login_method: "default", mac_binding: false, mobile_registration: false, account_validity_type: "days_from_first_login", account_validity_days: 2, voucher_validity_days: 10, upload_limit_mode: "enforce_limit", download_limit_mode: "enforce_limit", delete_inactive_accounts: true, max_inactive_days: 30 },
          { id: 3, plan_name: "Basic 10Mbps", download_kbps: 10240, upload_kbps: 2048, max_data_mb: null, max_duration_minutes: 1440, idle_timeout_minutes: 20, concurrent_sessions: 1, status: "active", use_for_new_vouchers: true, voucher_type: "login", random_user_id_string_type: "numeric", random_user_id_prefix: "date_of_month", password_type: "fixed", voucher_password: "pass123", currency_type: "INR", plan_charge: 99, login_method: "default", mac_binding: false, mobile_registration: false, account_validity_type: "days_from_first_login", account_validity_days: 1, voucher_validity_days: 10, upload_limit_mode: "enforce_limit", download_limit_mode: "enforce_limit", delete_inactive_accounts: true, max_inactive_days: 30 },
        ];
  const activePlans = rows.filter((row) => row.status === "active").length;
  const averageDownload = rows.length ? Math.round(rows.reduce((total, row) => total + row.download_kbps, 0) / rows.length / 1024) : 0;
  const Field = ({ label, field, type = "text", placeholder }: { label: string; field: keyof PlanFormState; type?: "text" | "number" | "password"; placeholder?: string }) => (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <input
        value={form[field]}
        onChange={(event) => updateForm(field, type === "number" ? event.target.value.replace(/[^\d]/g, "") : event.target.value)}
        type={type === "password" ? "password" : "text"}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#0f2748] bg-[#071323] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
      />
    </label>
  );
  const Select = ({ label, field, options }: { label: string; field: keyof PlanFormState; options: Array<[string, string]> }) => (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <select
        value={form[field]}
        onChange={(event) => updateForm(field, event.target.value)}
        className="w-full rounded-xl border border-[#0f2748] bg-[#071323] px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
      >
        {options.map(([value, labelText]) => <option key={value} value={value}>{labelText}</option>)}
      </select>
    </label>
  );
  const FormGroup = ({ title, children }: { title: string; children: ReactNode }) => (
    <section className="rounded-2xl border border-[#0f2748] bg-[#06101f] p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-blue-300">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <MetricTile label="Total Plans" value={rows.length} tone="blue" />
        <MetricTile label="Active" value={activePlans} tone="green" />
        <MetricTile label="Voucher Enabled" value={rows.filter((row) => row.use_for_new_vouchers).length} tone="cyan" />
        <MetricTile label="Disabled" value={rows.filter((row) => row.status !== "active").length} tone="red" />
        <MetricTile label="Avg Speed" value={`${averageDownload} Mbps`} tone="amber" />
      </section>

      <section className="glass-panel rounded-xl border border-[#0d274c] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">{selectedPlan ? `Edit ${selectedPlan.plan_name}` : "Create Usage Plan"}</h1>
            <p className="text-sm text-slate-400">Fields are based on the prepaid usage plan reference and mapped to hotspot/RADIUS enforcement values.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedPlan(null);
              setForm(defaultForm);
            }}
            className="rounded-lg border border-[#0f223d] bg-[#081223] px-3.5 py-2 text-xs font-semibold text-slate-300"
          >
            New Plan
          </button>
        </div>

        <div className="space-y-4">
          <FormGroup title="Plan details">
            <Select label="Use for new vouchers" field="use_for_new_vouchers" options={[["true", "Enable"], ["false", "Disable"]]} />
            <Field label="Plan name" field="plan_name" placeholder="Required" />
            <Select label="Voucher type" field="voucher_type" options={[["login", "Login"], ["voucher", "Voucher"], ["pin_only", "PIN Only"]]} />
            <Select label="Random user id string" field="random_user_id_string_type" options={[["numeric", "Numeric"], ["alpha_numeric", "Alpha Numeric"], ["mobile", "Mobile Number"]]} />
            <Select label="Random user id prefix" field="random_user_id_prefix" options={[["date_of_month", "Date of Month"], ["plan_code", "Plan Code"], ["none", "None"]]} />
            <Select label="Password type" field="password_type" options={[["fixed", "Fixed"], ["random_numeric", "Random Numeric"], ["random_alpha_numeric", "Random Alpha Numeric"], ["none", "None"]]} />
            <Field label="Password" field="voucher_password" type="password" placeholder="pass123" />
          </FormGroup>

          <FormGroup title="Pricing">
            <Select label="Currency type" field="currency_type" options={[["INR", "Indian Rupee"], ["USD", "US Dollar"], ["EUR", "Euro"], ["GBP", "British Pound"]]} />
            <Field label="Plan charge" field="plan_charge" type="number" placeholder="Required" />
          </FormGroup>

          <FormGroup title="Account settings">
            <Select label="Login method" field="login_method" options={[["default", "Default"], ["username_password", "Username + Password"], ["voucher_code", "Voucher Code"], ["mac_based", "MAC Based"]]} />
            <Select label="MAC binding" field="mac_binding" options={[["false", "Disable"], ["true", "Enable"]]} />
            <Select label="Concurrent login count" field="concurrent_sessions" options={[["0", "Unlimited"], ["1", "1"], ["2", "2"], ["3", "3"], ["5", "5"], ["10", "10"]]} />
            <Select label="Mobile registration" field="mobile_registration" options={[["false", "Disable"], ["true", "Enable"]]} />
            <Select label="Account validity type" field="account_validity_type" options={[["days_from_first_login", "Number of Days from First Login"], ["fixed_days", "Fixed Number of Days"], ["expiry_date", "Expiry Date Based"]]} />
            <Field label="Account validity days" field="account_validity_days" type="number" />
            <Field label="Voucher validity days" field="voucher_validity_days" type="number" />
          </FormGroup>

          <FormGroup title="Account limits">
            <Field label="Time quota minutes" field="max_duration_minutes" type="number" placeholder="Blank = No limit" />
            <Field label="Data transfer quota MB" field="max_data_mb" type="number" placeholder="Blank = No limit" />
            <Select label="Maximum upload bandwidth" field="upload_limit_mode" options={[["enforce_limit", "Enforce Limit"], ["no_limit", "No Limit"]]} />
            <Field label="Upload Kbps" field="upload_kbps" type="number" placeholder="Required when enforced" />
            <Select label="Maximum download bandwidth" field="download_limit_mode" options={[["enforce_limit", "Enforce Limit"], ["no_limit", "No Limit"]]} />
            <Field label="Download Kbps" field="download_kbps" type="number" placeholder="Required when enforced" />
            <Field label="Idle timeout minutes" field="idle_timeout_minutes" type="number" />
          </FormGroup>

          <FormGroup title="Account inactivity">
            <Select label="Delete inactive accounts" field="delete_inactive_accounts" options={[["true", "Enable"], ["false", "Disable"]]} />
            <Field label="Maximum inactive days" field="max_inactive_days" type="number" />
            <Select label="Plan status" field="status" options={[["active", "Active"], ["disabled", "Disabled"], ["draft", "Draft"]]} />
          </FormGroup>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => (selectedPlan ? updatePlan.mutate() : createPlan.mutate())}
              disabled={!form.plan_name || createPlan.isPending || updatePlan.isPending}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {selectedPlan ? "Update plan" : "Save plan"}
            </button>
            {selectedPlan ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedPlan(null);
                  setForm(defaultForm);
                }}
                className="rounded-xl border border-[#17365f] px-5 py-3 text-sm font-semibold text-slate-300"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-xl border border-[#0d274c] p-5">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-white">Access Plans</h1>
          <p className="text-sm text-slate-400">Saved prepaid usage plans and their enforcement limits.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[#0f223d]">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/40 text-left text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Plan</th>
                <th className="p-4">Download</th>
                <th className="p-4">Upload</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Sessions</th>
                <th className="p-4">Charge</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0f223d]">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-900/30">
                  <td className="p-4 text-white">{row.plan_name}</td>
                  <td className="p-4 text-slate-300">{row.download_limit_mode === "no_limit" ? "No Limit" : `${Math.round(row.download_kbps / 1024)} Mbps`}</td>
                  <td className="p-4 text-slate-300">{row.upload_limit_mode === "no_limit" ? "No Limit" : `${Math.round(row.upload_kbps / 1024)} Mbps`}</td>
                  <td className="p-4 text-slate-300">{row.max_duration_minutes ? `${row.max_duration_minutes} min` : "No Limit"}</td>
                  <td className="p-4 text-slate-300">{row.concurrent_sessions || "Unlimited"}</td>
                  <td className="p-4 text-slate-300">{row.plan_charge == null ? "-" : `${row.currency_type} ${row.plan_charge}`}</td>
                  <td className="p-4"><StatusPill status={row.status === "active" ? "Online" : "Disabled"} /></td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => editPlan(row)} className="rounded-lg border border-blue-500/30 px-3 py-1.5 text-xs font-semibold text-blue-300">Edit</button>
                      <button type="button" onClick={() => deletePlan.mutate(row.id)} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-300">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function VouchersPage() {
  const batches = useQuery<VoucherBatch[]>({ queryKey: ["/vouchers/batches"], queryFn: () => getList<VoucherBatch[]>("/vouchers/batches") });
  const vouchers = useQuery<VoucherItem[]>({ queryKey: ["/vouchers"], queryFn: () => getList<VoucherItem[]>("/vouchers") });
  const batchRows =
    batches.data?.length
      ? batches.data
      : [
          { id: 1, batch_name: "Guest Batch", code_prefix: "GUEST", quantity: 10, status: "ready", expires_at: "2026-07-21" },
          { id: 2, batch_name: "Conference", code_prefix: "CONF", quantity: 50, status: "active", expires_at: "2026-08-01" },
        ];
  const voucherRows =
    vouchers.data?.length
      ? vouchers.data
      : [
          { id: 1, batch_id: 1, code: "GUEST-001", pin: "2391", status: "available", redeemed_at: null, blocked_at: null },
          { id: 2, batch_id: 1, code: "GUEST-002", pin: "4210", status: "blocked", redeemed_at: null, blocked_at: "2026-06-20" },
          { id: 3, batch_id: 2, code: "CONF-011", pin: "9832", status: "redeemed", redeemed_at: "2026-06-18", blocked_at: null },
        ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <MetricTile label="Batches" value={batchRows.length} tone="blue" />
        <MetricTile label="Codes" value={voucherRows.length} tone="green" />
        <MetricTile label="Available" value={voucherRows.filter((voucher) => voucher.status === "available").length} tone="cyan" />
        <MetricTile label="Blocked" value={voucherRows.filter((voucher) => voucher.status === "blocked").length} tone="red" />
        <MetricTile label="Redeemed" value={voucherRows.filter((voucher) => voucher.status === "redeemed").length} tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel rounded-xl border border-[#0d274c] p-5">
          <h1 className="text-xl font-semibold text-white">Voucher Batches</h1>
          <p className="mt-1 text-sm text-slate-400">Batch generation and code tracking in the same reference UI style.</p>
          <div className="mt-5 space-y-3">
            {batchRows.map((batch) => (
              <div key={batch.id} className="rounded-2xl border border-[#0f223d] bg-[#081223] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">{batch.batch_name}</div>
                    <div className="text-xs text-slate-400">{batch.code_prefix} · {batch.quantity} codes · {batch.status}</div>
                  </div>
                  <span className="rounded-full border border-[#0f223d] px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">Batch</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-xl border border-[#0d274c] p-5">
          <h2 className="text-xl font-semibold text-white">Voucher Codes</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#0f223d]">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/40 text-left text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-4">Code</th>
                  <th className="p-4">PIN</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0f223d]">
                {voucherRows.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-slate-900/30">
                    <td className="p-4 text-white">{voucher.code}</td>
                    <td className="p-4 text-slate-300">{voucher.pin}</td>
                    <td className="p-4"><StatusPill status={voucher.status === "blocked" ? "Disabled" : voucher.status === "redeemed" ? "Online" : "Offline"} /></td>
                    <td className="p-4"><button className="rounded-full border border-[#0f223d] px-3 py-1 text-xs text-slate-300">{voucher.status === "blocked" ? "Unblock" : "Block"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function FirewallPage() {
  const queryClient = useQueryClient();
  const zones = useQuery<FirewallZone[]>({ queryKey: ["/firewall/zones"], queryFn: () => getList<FirewallZone[]>("/firewall/zones") });
  const rules = useQuery<FirewallRule[]>({ queryKey: ["/firewall/rules"], queryFn: () => getList<FirewallRule[]>("/firewall/rules") });
  const interfaces = useQuery<NetworkInterfaceItem[]>({ queryKey: ["/network/interfaces"], queryFn: () => getList<NetworkInterfaceItem[]>("/network/interfaces") });
  const zoneRows =
    zones.data?.length
      ? zones.data
      : [
          { id: 1, name: "lan", policy: "accept", interfaces: ["lan0", "lan1"] },
          { id: 2, name: "guest", policy: "drop", interfaces: ["wlan0"] },
          { id: 3, name: "iot", policy: "reject", interfaces: ["iot0"] },
        ];
  const fallbackFirewallRules: FirewallRule[] = [
    {
      ...defaultFirewallRuleForm,
      id: 1,
      zone_id: 1,
      destination_zone_id: 1,
      rule_name: "Allow DNS",
      action: "accept",
      destination: "any",
      protocol: "udp",
      port: "53",
      enabled: true,
      comment: "Core resolver access",
    },
    {
      ...defaultFirewallRuleForm,
      id: 2,
      zone_id: 2,
      destination_zone_id: 1,
      rule_name: "Block SMTP",
      action: "reject",
      destination: "any",
      protocol: "tcp",
      port: "25",
      enabled: true,
      log: true,
      comment: "Prevent direct mail abuse",
    },
    {
      ...defaultFirewallRuleForm,
      id: 3,
      zone_id: 3,
      destination_zone_id: 1,
      rule_name: "Allow NTP",
      action: "accept",
      destination: "any",
      protocol: "udp",
      port: "123",
      enabled: false,
      comment: "Time sync policy",
    },
  ];
  const ruleRows: FirewallRule[] =
    rules.data?.length
      ? rules.data
      : fallbackFirewallRules;
  const [selected, setSelected] = useState<FirewallRule | null>(null);
  const [form, setForm] = useState<FirewallRuleForm>(() => ({ ...defaultFirewallRuleForm, zone_id: zoneRows[0]?.id ?? 0 }));

  useEffect(() => {
    if (!form.zone_id && zoneRows[0]?.id) {
      setForm((current) => ({ ...current, zone_id: zoneRows[0].id }));
    }
  }, [zoneRows[0]?.id]);

  const zoneOptions = zoneRows.map((zone) => [String(zone.id), zone.name.toUpperCase()] as [string, string]);
  const interfaceOptions: Array<[string, string]> = [["any", "Any"], ...(interfaces.data ?? []).map((item) => [item.name, item.name] as [string, string])];

  const reset = () => {
    setSelected(null);
    setForm({ ...defaultFirewallRuleForm, zone_id: zoneRows[0]?.id ?? 0 });
  };

  const selectRule = (rule: FirewallRule) => {
    setSelected(rule);
    setForm({
      zone_id: rule.zone_id,
      destination_zone_id: rule.destination_zone_id,
      rule_name: rule.rule_name,
      action: rule.action,
      time_restriction: rule.time_restriction ?? "disable",
      connections_per_second: rule.connections_per_second ?? "no_limit",
      source: rule.source ?? "any",
      source_mac: rule.source_mac ?? "any",
      exclude_source: rule.exclude_source ?? "none",
      exclude_source_mac: rule.exclude_source_mac ?? "none",
      source_interface: rule.source_interface ?? "any",
      destination: rule.destination ?? "",
      exclude_destination: rule.exclude_destination ?? "none",
      destination_interface: rule.destination_interface ?? "any",
      protocol: rule.protocol ?? "",
      port: rule.port ?? "",
      log: rule.log ?? false,
      comment: rule.comment ?? "",
      enabled: rule.enabled,
    });
  };

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: FirewallRuleForm }) =>
      id ? updateRecord<FirewallRule>(`/firewall/rules/${id}`, payload) : createRecord<FirewallRule>("/firewall/rules", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/firewall/rules"] });
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRecord(`/firewall/rules/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/firewall/rules"] });
      reset();
    },
  });
  const applyMutation = useMutation({
    mutationFn: () => createRecord<{ status: string; message: string }>("/firewall/apply", { dry_run: false, execute: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/gateway/jobs"] });
    },
  });

  return (
    <div className="space-y-3">
      <section className="grid gap-3 md:grid-cols-4">
        <MetricTile label="Zones" value={zoneRows.length} tone="blue" />
        <MetricTile label="Rules" value={ruleRows.length} tone="green" />
        <MetricTile label="Enabled" value={ruleRows.filter((rule) => rule.enabled).length} tone="cyan" />
        <MetricTile label="Logged" value={ruleRows.filter((rule) => rule.log).length} tone="amber" />
      </section>

      <section className="grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-lg border border-[#0d274c] bg-[#020813] p-4 shadow-glow">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-sm font-semibold uppercase text-slate-200">Filter Rules</h1>
              <p className="text-xs text-slate-500">Select a rule to configure traffic flow.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="rounded border border-[#0f223d] bg-[#081223] p-2 text-slate-300" title="Add rule">
                <Plus className="h-4 w-4" />
              </button>
              <button onClick={() => rules.refetch()} className="rounded border border-[#0f223d] bg-[#081223] p-2 text-slate-300" title="Refresh rules">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {ruleRows.map((rule) => {
              const sourceZone = zoneRows.find((zone) => zone.id === rule.zone_id)?.name ?? "source";
              const destinationZone = zoneRows.find((zone) => zone.id === rule.destination_zone_id)?.name ?? "required";
              return (
                <button
                  key={rule.id}
                  onClick={() => selectRule(rule)}
                  className={`w-full rounded-lg border p-3 text-left transition ${selected?.id === rule.id ? "border-blue-500/50 bg-blue-600/20" : "border-[#0f223d] bg-[#081223] hover:bg-[#0c2041]"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-bold text-white">{rule.rule_name}</div>
                      <div className="mt-1 text-xs uppercase text-blue-300">{sourceZone} → {destinationZone}</div>
                    </div>
                    <StatusPill status={rule.enabled ? "Online" : "Offline"} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>{rule.action.toUpperCase()} {rule.protocol || "any"}</span>
                    <span>{rule.port ? `port ${rule.port}` : "all ports"}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{rule.source || "any"} → {rule.destination || "any"}</div>
                </button>
              );
            })}
            {!ruleRows.length ? <div className="rounded-lg border border-[#0f223d] bg-[#081223] p-4 text-sm text-slate-400">No filter rules configured yet. Use the plus button to add one.</div> : null}
          </div>
        </div>

        <div className="rounded-lg border border-[#0d274c] bg-[#020813] p-5 shadow-glow">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#0f223d] pb-4">
            <div>
              <div className="text-xs font-semibold uppercase text-blue-400">{selected ? "Firewall Rule" : "New Firewall Rule"}</div>
              <h2 className="mt-1 text-2xl font-black text-white">{selected?.rule_name || "Filter Rule"}</h2>
              <div className="mt-1 text-xs text-slate-400">{form.action} · {form.protocol || "protocol required"} · {form.destination_zone_id ? "ready to save" : "destination zone required"}</div>
              {applyMutation.data ? <div className="mt-2 text-xs text-emerald-300">System apply: {applyMutation.data.status} · {applyMutation.data.message}</div> : null}
              {applyMutation.isError ? <div className="mt-2 text-xs text-red-300">System apply failed. Check gateway job logs.</div> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {selected ? (
                <button onClick={() => deleteMutation.mutate(selected.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300">
                  Delete
                </button>
              ) : null}
              <button
                disabled={saveMutation.isPending || !form.zone_id || !form.rule_name || !form.destination_zone_id}
                onClick={() => saveMutation.mutate({ id: selected?.id, payload: form })}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Save Rule
              </button>
              <button
                disabled={applyMutation.isPending}
                onClick={() => applyMutation.mutate()}
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 disabled:opacity-60"
              >
                Apply to System
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <ReferencePanel title="Control">
                <div className="grid gap-3 md:grid-cols-2">
                  <NetworkSelect label="Enable" value={form.enabled ? "enable" : "disable"} onChange={(value) => setForm((current) => ({ ...current, enabled: value === "enable" }))} options={[["enable", "Enable"], ["disable", "Disable"]]} />
                  <NetworkInput label="Rule Name" value={form.rule_name} onChange={(value) => setForm((current) => ({ ...current, rule_name: value }))} />
                  <NetworkSelect label="Time Restriction" value={form.time_restriction} onChange={(value) => setForm((current) => ({ ...current, time_restriction: value }))} options={[["disable", "Disable"], ["always", "Always"], ["business_hours", "Business Hours"], ["custom", "Custom"]]} />
                  <NetworkSelect label="Connections per Second" value={form.connections_per_second} onChange={(value) => setForm((current) => ({ ...current, connections_per_second: value }))} options={[["no_limit", "No Limit"], ["10", "10"], ["50", "50"], ["100", "100"], ["custom", "Custom"]]} />
                </div>
              </ReferencePanel>

              <ReferencePanel title="Protocol">
                <div className="grid gap-3 md:grid-cols-2">
                  <NetworkSelect label="Action" value={form.action} onChange={(value) => setForm((current) => ({ ...current, action: value }))} options={[["accept", "Accept"], ["drop", "Drop"], ["reject", "Reject"]]} />
                  <NetworkSelect label="Protocol" value={form.protocol ?? ""} onChange={(value) => setForm((current) => ({ ...current, protocol: value }))} options={[["", "Required"], ["any", "Any"], ["tcp", "TCP"], ["udp", "UDP"], ["icmp", "ICMP"], ["gre", "GRE"]]} />
                  <NetworkSelect label="Log" value={form.log ? "enable" : "disable"} onChange={(value) => setForm((current) => ({ ...current, log: value === "enable" }))} options={[["disable", "Disable"], ["enable", "Enable"]]} />
                  <NetworkInput label="Service / Port" value={form.port ?? ""} onChange={(value) => setForm((current) => ({ ...current, port: value }))} />
                </div>
              </ReferencePanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <ReferencePanel title="Source Zone">
                <NetworkSelect label="Zone" value={String(form.zone_id || "")} onChange={(value) => setForm((current) => ({ ...current, zone_id: Number(value) }))} options={[["", "Required"], ...zoneOptions]} />
              </ReferencePanel>

              <ReferencePanel title="Destination Zone">
                <NetworkSelect label="Zone" value={String(form.destination_zone_id ?? "")} onChange={(value) => setForm((current) => ({ ...current, destination_zone_id: value ? Number(value) : null }))} options={[["", "Required"], ...zoneOptions]} />
              </ReferencePanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <ReferencePanel title="Source Qualifier">
                <div className="grid gap-3 md:grid-cols-2">
                  <NetworkInput label="Source Address" value={form.source ?? "any"} onChange={(value) => setForm((current) => ({ ...current, source: value }))} />
                  <NetworkInput label="Source MAC Address" value={form.source_mac ?? "any"} onChange={(value) => setForm((current) => ({ ...current, source_mac: value }))} />
                  <NetworkInput label="Exclude Source Address" value={form.exclude_source ?? "none"} onChange={(value) => setForm((current) => ({ ...current, exclude_source: value }))} />
                  <NetworkInput label="Exclude Source MAC Address" value={form.exclude_source_mac ?? "none"} onChange={(value) => setForm((current) => ({ ...current, exclude_source_mac: value }))} />
                  <NetworkSelect label="Source Interface" value={form.source_interface ?? "any"} onChange={(value) => setForm((current) => ({ ...current, source_interface: value }))} options={interfaceOptions} />
                </div>
              </ReferencePanel>

              <ReferencePanel title="Destination Qualifier">
                <div className="grid gap-3 md:grid-cols-2">
                  <NetworkInput label="Destination Address" value={form.destination ?? ""} onChange={(value) => setForm((current) => ({ ...current, destination: value }))} />
                  <NetworkInput label="Exclude Destination Address" value={form.exclude_destination ?? "none"} onChange={(value) => setForm((current) => ({ ...current, exclude_destination: value }))} />
                  <NetworkSelect label="Destination Interface" value={form.destination_interface ?? "any"} onChange={(value) => setForm((current) => ({ ...current, destination_interface: value }))} options={interfaceOptions} />
                  <NetworkInput label="Comment" value={form.comment ?? ""} onChange={(value) => setForm((current) => ({ ...current, comment: value }))} />
                </div>
              </ReferencePanel>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SimpleListPage({ path, title }: { path: string; title: string }) {
  const query = useQuery({ queryKey: [path], queryFn: () => getList(path) });
  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-xl border border-[#0d274c] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">{title}</h1>
            <p className="text-sm text-slate-400">Reference-style shell for the next development slice.</p>
          </div>
          <button className="rounded-lg border border-[#0f223d] bg-[#081223] px-3.5 py-2 text-xs font-semibold text-slate-300">Refresh</button>
        </div>
      </section>
      <section className="glass-panel rounded-xl border border-[#0d274c] p-5">
        <pre className="overflow-auto rounded-2xl bg-[#07131f] p-4 text-xs text-slate-300">{JSON.stringify(query.data ?? [], null, 2)}</pre>
      </section>
    </div>
  );
}

function PlannedSessionPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricTile label="Module" value="Planned" tone="blue" />
        <MetricTile label="Data Source" value="Next" tone="cyan" />
        <MetricTile label="Status" value="UI Ready" tone="green" />
      </section>
      <section className="glass-panel rounded-xl border border-[#0d274c] p-5">
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p>
        </div>
        <div className="mt-5 rounded-2xl border border-[#0f223d] bg-[#081223] p-4 text-sm text-slate-300">
          This section is reserved for the next development slice. We will connect backend data, filters, export, and live session actions when the module API is designed.
        </div>
      </section>
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone,
  delta,
  highlight,
}: {
  label: string;
  value: string | number;
  tone: "blue" | "green" | "red" | "amber" | "cyan";
  delta?: string;
  highlight?: boolean;
}) {
  const toneMap = {
    blue: "text-blue-400",
    green: "text-emerald-400",
    red: "text-red-400",
    amber: "text-amber-400",
    cyan: "text-cyan-400",
  };
  return (
    <div className={`glass-panel rounded-xl border border-[#0d274c] p-4 ${highlight ? "bg-blue-950/20" : ""}`}>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-2xl font-extrabold ${toneMap[tone]}`}>{value}</p>
      {delta ? <span className="text-[9px] font-semibold text-emerald-400">{delta}</span> : null}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map =
    status === "Online"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
      : status === "Disabled"
        ? "border-red-500/20 bg-red-500/10 text-red-400"
        : status === "Offline"
          ? "border-slate-700 bg-slate-800 text-slate-400"
          : "border-amber-500/20 bg-amber-500/10 text-amber-400";
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${map}`}>{status}</span>;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      <span>{label}:</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-[#0f223d] bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-blue-500">
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "All" ? `All ${label}s` : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusLegend({ color, label, value }: { color: "emerald" | "slate" | "amber" | "red"; label: string; value: number }) {
  const colorMap = {
    emerald: "bg-emerald-400",
    slate: "bg-slate-500",
    amber: "bg-amber-400",
    red: "bg-red-400",
  };
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${colorMap[color]}`} />
      <span>
        {label}: <strong>{value}</strong>
      </span>
    </div>
  );
}

export default function Shell() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [collapsedNavSections, setCollapsedNavSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") {
      return {};
    }

    try {
      const storedValue = window.localStorage.getItem(NAV_SECTION_STORAGE_KEY);
      return storedValue ? (JSON.parse(storedValue) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  const toggleNavSection = (title: string) => {
    setCollapsedNavSections((current) => ({
      ...current,
      [title]: !current[title],
    }));
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(NAV_SECTION_STORAGE_KEY, JSON.stringify(collapsedNavSections));
  }, [collapsedNavSections]);

  useEffect(() => {
    const activeSection = navSections.find((section) => isSectionRouteActive(section, location.pathname));

    if (!activeSection) {
      return;
    }

    setCollapsedNavSections((current) => {
      if (!current[activeSection.title]) {
        return current;
      }

      return {
        ...current,
        [activeSection.title]: false,
      };
    });
  }, [location.pathname]);

  return (
    <div className="min-h-full bg-[#02050a] text-slate-100">
      <div className="flex min-h-full gap-3 p-3">
        <aside className="hidden w-[230px] shrink-0 flex-col justify-between rounded-lg border border-[#0d274c] bg-[#030914] p-3 shadow-glow xl:flex">
          <div>
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#0d274c] bg-[#061326] p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-300">
                <Shield className="h-7 w-7" />
              </div>
              <div>
                <div className="text-xl font-black tracking-wide text-white">TINNICORE</div>
                <div className="text-[9px] font-semibold uppercase text-slate-400">Network. Secure. Connect.</div>
              </div>
            </div>

            <nav className="space-y-4">
              {navSections.map((section) => {
                const isCollapsed = Boolean(collapsedNavSections[section.title]);
                const isActiveSection = isSectionRouteActive(section, location.pathname);

                return (
                  <div key={section.title}>
                    <button
                      type="button"
                      aria-expanded={!isCollapsed}
                      onClick={() => toggleNavSection(section.title)}
                      className={`mb-1 flex w-full items-center justify-between border-b border-[#0f223d] pb-1 text-left text-[10px] font-bold uppercase transition ${
                        isActiveSection ? "text-blue-200" : "text-blue-400 hover:text-blue-200"
                      }`}
                    >
                      <span>{section.title}</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? "-rotate-90" : "rotate-0"}`} />
                    </button>
                    {!isCollapsed ? (
                      <div className="space-y-1">
                        {section.items.map(([label, to, Icon]) => (
                          <NavLink
                            key={`${section.title}-${label}`}
                            to={to}
                            className={({ isActive }) =>
                              `group flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition ${
                                isActive
                                  ? "border border-blue-500/40 bg-blue-600/25 text-white"
                                  : "text-slate-400 hover:bg-[#071329] hover:text-slate-200"
                              }`
                            }
                            end={to === "/"}
                          >
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {label}
                            </span>
                            {to === "/" ? <ChevronRight className="h-3 w-3 opacity-60" /> : null}
                          </NavLink>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="mt-4 rounded-lg border border-[#0d274c] bg-[#061326] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-12 items-center justify-center rounded border border-blue-500/30 bg-blue-500/10">
                <Server className="h-6 w-6 text-blue-300" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">TINNICORE 150</div>
                <div className="text-[10px] font-semibold text-emerald-400">ONLINE</div>
                <div className="text-[9px] text-slate-500">OS: v1.2.8</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-3">
          <header className="grid gap-3 xl:grid-cols-[310px_1fr_310px]">
            <div className="rounded-lg border border-[#0d274c] bg-[#030914] p-3 shadow-glow">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-300">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">System Status</div>
                  <div className="text-lg font-black text-emerald-400">ONLINE</div>
                  <div className="text-[10px] text-slate-500">All Systems Operational</div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border border-[#0d274c] bg-[#030914] p-3 text-center shadow-glow">
              <div className="absolute left-0 top-1/2 h-px w-1/3 bg-gradient-to-r from-transparent to-blue-500/40" />
              <div className="absolute right-0 top-1/2 h-px w-1/3 bg-gradient-to-l from-transparent to-blue-500/40" />
              <div className="relative text-4xl font-black tracking-[0.16em] text-white">TINNICORE</div>
              <div className="relative text-xs font-semibold uppercase text-slate-300">Network. Secure. Connect.</div>
            </div>

            <div className="rounded-lg border border-[#0d274c] bg-[#030914] p-3 shadow-glow">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-lg text-white">10:42:31 AM</div>
                  <div className="text-[10px] text-slate-500">May 20, 2025</div>
                </div>
                <button className="relative rounded-md border border-[#0f223d] bg-[#081223] p-2 text-slate-300"><Bell className="h-4 w-4" /><span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1 text-[9px] text-white">3</span></button>
                <button className="rounded-md border border-[#0f223d] bg-[#081223] p-2 text-slate-300"><Settings className="h-4 w-4" /></button>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-500/40 bg-blue-500/10 text-blue-300">A</div>
                  <div className="leading-tight">
                    <div className="text-xs font-bold text-white">{user?.username ?? "admin"}</div>
                    <div className="text-[10px] text-slate-400">Super Administrator</div>
                  </div>
                </div>
                <button onClick={signOut} className="rounded-md border border-[#0f223d] bg-[#081223] px-2 py-1 text-[10px] text-slate-300">Exit</button>
              </div>
            </div>
          </header>

          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/vouchers" element={<VouchersPage />} />
            <Route path="/sessions" element={<SimpleListPage path="/sessions/active" title="Sessions" />} />
            <Route path="/bandwidth-toppers" element={<PlannedSessionPage title="Bandwidth Toppers" description="Identify users and sessions consuming the most bandwidth across selected time windows, interfaces, and access plans." />} />
            <Route path="/user-accounts" element={<PlannedSessionPage title="User's Account" description="Account-oriented session view for balances, validity, current plan, voucher state, and active login associations." />} />
            <Route path="/login-status" element={<PlannedSessionPage title="Login Status" description="Live authentication status board showing accepted, rejected, pending, and recently expired login attempts." />} />
            <Route path="/login-log" element={<PlannedSessionPage title="Login Log" description="Historical login audit trail with username, voucher, client IP, MAC address, NAS, plan, and RADIUS result details." />} />
            <Route path="/logout-log" element={<PlannedSessionPage title="Logout Log" description="Historical logout and disconnect log with session duration, consumed data, disconnect reason, and accounting status." />} />
            <Route path="/network" element={<NetworkInterfacesPage />} />
            <Route path="/routing" element={<StaticRoutesPage />} />
            <Route path="/port-forwarding" element={<PortForwardingPage />} />
            <Route path="/dhcp-dns" element={<DhcpDnsPage />} />
            <Route path="/dyndns" element={<DynamicDnsPage />} />
            <Route path="/wan" element={<SimpleListPage path="/wan/interfaces" title="WAN" />} />
            <Route path="/firewall" element={<FirewallPage />} />
            <Route path="/gateway" element={<GatewayPage />} />
            <Route path="/license" element={<SimpleListPage path="/license/status" title="License" />} />
            <Route path="/firmware" element={<SimpleListPage path="/firmware/available" title="Firmware" />} />
            <Route path="/telemetry" element={<SimpleListPage path="/telemetry/samples" title="Telemetry" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
