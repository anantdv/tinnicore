import { useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRecord, deleteRecord, getList, updateRecord } from "../../shared/api";

type RenderedConfig = {
  path: string;
  content: string;
  description: string;
};

type CommandStep = {
  command: string;
  description: string;
};

type FileWrite = {
  path: string;
  bytes_written: number;
};

type CommandResult = {
  command: string;
  returncode: number;
  stdout: string;
  stderr: string;
};

type GatewayApplyResult = {
  job_id: number;
  component: string;
  status: string;
  dry_run: boolean;
  rendered_configs: RenderedConfig[];
  commands: CommandStep[];
  file_writes: FileWrite[];
  command_results: CommandResult[];
  executed: boolean;
  message: string;
};

type HotspotPortal = {
  id: number;
  portal_name: string;
  portal_host: string;
  landing_path: string;
  success_path: string;
  allowed_hosts: string[];
  welcome_message: string | null;
  builder_config: PortalBuilderConfig | null;
  is_active: boolean;
};

type PortalComponentType = "hero" | "text" | "login" | "voucher" | "button" | "image" | "features";

type PortalBuilderComponent = {
  id: string;
  type: PortalComponentType;
  label: string;
  content: string;
  x: number;
  y: number;
  width: number;
  align: "left" | "center" | "right";
  color: string;
  background: string;
  imageUrl?: string;
};

type PortalBuilderConfig = {
  theme: {
    backgroundColor: string;
    backgroundImage: string;
    accentColor: string;
    textColor: string;
    cardColor: string;
  };
  components: PortalBuilderComponent[];
};

const defaultPortalBuilderConfig: PortalBuilderConfig = {
  theme: {
    backgroundColor: "#04111f",
    backgroundImage: "",
    accentColor: "#00b8ff",
    textColor: "#f8fbff",
    cardColor: "rgba(4, 18, 35, 0.82)",
  },
  components: [
    { id: "hero-title", type: "hero", label: "Hero title", content: "Welcome to TINNICORE Wi-Fi", x: 8, y: 10, width: 52, align: "left", color: "#f8fbff", background: "transparent" },
    { id: "hero-copy", type: "text", label: "Intro text", content: "Fast, secure guest access powered by TINNICORE OS.", x: 8, y: 28, width: 48, align: "left", color: "#9fbce4", background: "transparent" },
    { id: "login-card", type: "login", label: "Login card", content: "Sign in with your hotspot account", x: 58, y: 14, width: 34, align: "left", color: "#f8fbff", background: "rgba(5, 22, 43, 0.88)" },
    { id: "voucher-card", type: "voucher", label: "Voucher access", content: "Have a voucher? Enter your code and PIN.", x: 58, y: 55, width: 34, align: "left", color: "#f8fbff", background: "rgba(5, 22, 43, 0.72)" },
    { id: "features-strip", type: "features", label: "Features", content: "Secure browsing|High speed access|Session tracking", x: 8, y: 66, width: 44, align: "left", color: "#d9ecff", background: "rgba(0, 184, 255, 0.08)" },
  ],
};

const componentLabels: Record<PortalComponentType, string> = {
  hero: "Hero",
  text: "Text",
  login: "Login Form",
  voucher: "Voucher Form",
  button: "Button",
  image: "Image",
  features: "Features",
};

function clonePortalBuilderConfig(config?: PortalBuilderConfig | null): PortalBuilderConfig {
  return JSON.parse(JSON.stringify(config ?? defaultPortalBuilderConfig)) as PortalBuilderConfig;
}

function createPortalComponent(type: PortalComponentType, x = 12, y = 12): PortalBuilderComponent {
  const id = `component-${Date.now()}-${Math.round(Math.random() * 10000)}`;
  const base = {
    id,
    type,
    label: componentLabels[type],
    x,
    y,
    width: type === "hero" ? 48 : type === "image" ? 30 : 36,
    align: "left" as const,
    color: "#f8fbff",
    background: type === "hero" || type === "text" ? "transparent" : "rgba(5, 22, 43, 0.82)",
  };

  const contentByType: Record<PortalComponentType, string> = {
    hero: "Welcome to TINNICORE Wi-Fi",
    text: "Add helpful instructions for guests before they connect.",
    login: "Sign in with your hotspot account",
    voucher: "Have a voucher? Enter your code and PIN.",
    button: "Connect Now",
    image: "Portal image",
    features: "Secure browsing|High speed access|Session tracking",
  };

  return {
    ...base,
    content: contentByType[type],
    imageUrl: type === "image" ? "" : undefined,
  };
}

type RadiusProfile = {
  id: number;
  access_plan_id: number;
  profile_name: string;
  radius_group_name: string;
  reply_attributes: Record<string, string> | null;
  is_default: boolean;
};

type RadiusNasDevice = {
  id: number;
  name: string;
  ip_address: string;
  secret: string;
  short_name: string | null;
  enabled: boolean;
};

type GatewayApplyJob = {
  id: number;
  component: string;
  status: string;
  dry_run: boolean;
  requested_by_user_id: number | null;
  rendered_configs: Record<string, { description: string; content: string }> | null;
  command_plan: Array<{ command: string; description: string }> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type RadiusAuthAttempt = {
  id: number;
  username: string;
  auth_method: string;
  result: string;
  reason: string | null;
  client_ip: string | null;
  client_mac: string | null;
  nas_ip: string | null;
  voucher_code: string | null;
  plan_name: string | null;
  session_token: string | null;
  created_at: string;
  updated_at: string;
};

type PreviewResponse = {
  freeradius: RenderedConfig;
  hotspot: RenderedConfig;
  firewall: RenderedConfig;
};

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">{subtitle}</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h2>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password" | "number";
  placeholder?: string;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-600">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(type === "number" ? event.target.value.replace(/[^\d-]/g, "") : event.target.value)}
        type={type === "number" ? "text" : type}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
      />
      {help ? <div className="mt-1 text-xs text-slate-500">{help}</div> : null}
    </label>
  );
}

function PreviewBlock({ config }: { config?: RenderedConfig }) {
  if (!config) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No preview available.</div>;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-slate-900">{config.description}</div>
          <div className="text-xs text-slate-500">{config.path}</div>
        </div>
      </div>
      <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-[11px] leading-5 text-slate-100">{config.content}</pre>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint: string;
  accent: "blue" | "green" | "purple" | "red" | "amber";
}) {
  const badgeStyles = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-violet-50 text-violet-600",
    red: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-glow">
      <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] ${badgeStyles[accent]}`}>{label}</div>
      <div className="mt-4 text-3xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{hint}</div>
    </div>
  );
}

export default function GatewayPage() {
  const queryClient = useQueryClient();
  const [applyTarget, setApplyTarget] = useState<"radius" | "hotspot" | "firewall" | "all">("all");
  const [execute, setExecute] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<HotspotPortal | null>(null);
  const [selectedRadiusProfile, setSelectedRadiusProfile] = useState<RadiusProfile | null>(null);
  const [selectedNasDevice, setSelectedNasDevice] = useState<RadiusNasDevice | null>(null);
  const [portalName, setPortalName] = useState("default");
  const [portalHost, setPortalHost] = useState("portal.tinnicore.local");
  const [portalLanding, setPortalLanding] = useState("/login");
  const [portalSuccess, setPortalSuccess] = useState("/status");
  const [portalAllowedHosts, setPortalAllowedHosts] = useState("127.0.0.1,localhost");
  const [portalWelcome, setPortalWelcome] = useState("Welcome to TINNICORE Wi-Fi");
  const [portalBuilder, setPortalBuilder] = useState<PortalBuilderConfig>(() => clonePortalBuilderConfig());
  const [selectedBuilderId, setSelectedBuilderId] = useState("login-card");
  const portalPreviewRef = useRef<HTMLDivElement | null>(null);
  const [radiusProfileName, setRadiusProfileName] = useState("guest-1h");
  const [radiusGroupName, setRadiusGroupName] = useState("guest-1h");
  const [radiusPlanId, setRadiusPlanId] = useState("1");
  const [nasName, setNasName] = useState("advgate-local");
  const [nasIp, setNasIp] = useState("127.0.0.1");
  const [nasSecret, setNasSecret] = useState("");
  const [nasShortName, setNasShortName] = useState("advgate");

  const preview = useQuery<PreviewResponse>({ queryKey: ["/gateway/preview"], queryFn: () => getList("/gateway/preview") });
  const portals = useQuery<HotspotPortal[]>({ queryKey: ["/gateway/portals"], queryFn: () => getList("/gateway/portals") });
  const radiusProfiles = useQuery<RadiusProfile[]>({ queryKey: ["/gateway/radius-profiles"], queryFn: () => getList("/gateway/radius-profiles") });
  const nasDevices = useQuery<RadiusNasDevice[]>({ queryKey: ["/gateway/nas-devices"], queryFn: () => getList("/gateway/nas-devices") });
  const jobs = useQuery<GatewayApplyJob[]>({ queryKey: ["/gateway/jobs"], queryFn: () => getList("/gateway/jobs") });
  const attempts = useQuery<RadiusAuthAttempt[]>({ queryKey: ["/gateway/hotspot/attempts"], queryFn: () => getList("/gateway/hotspot/attempts") });

  const selectedBuilderComponent = portalBuilder.components.find((component) => component.id === selectedBuilderId) ?? portalBuilder.components[0];

  const patchBuilderTheme = (patch: Partial<PortalBuilderConfig["theme"]>) => {
    setPortalBuilder((current) => ({ ...current, theme: { ...current.theme, ...patch } }));
  };

  const patchBuilderComponent = (componentId: string, patch: Partial<PortalBuilderComponent>) => {
    setPortalBuilder((current) => ({
      ...current,
      components: current.components.map((component) => (component.id === componentId ? { ...component, ...patch } : component)),
    }));
  };

  const addBuilderComponent = (type: PortalComponentType, x = 12, y = 12) => {
    const component = createPortalComponent(type, x, y);
    setPortalBuilder((current) => ({ ...current, components: [...current.components, component] }));
    setSelectedBuilderId(component.id);
  };

  const deleteBuilderComponent = (componentId: string) => {
    setPortalBuilder((current) => {
      const nextComponents = current.components.filter((component) => component.id !== componentId);
      setSelectedBuilderId(nextComponents[0]?.id ?? "");
      return { ...current, components: nextComponents };
    });
  };

  const handlePortalCanvasDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const bounds = portalPreviewRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }
    const x = Math.min(90, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.min(88, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100));
    const componentId = event.dataTransfer.getData("component-id");
    const componentType = event.dataTransfer.getData("component-type") as PortalComponentType;
    if (componentId) {
      patchBuilderComponent(componentId, { x: Math.round(x), y: Math.round(y) });
      return;
    }
    if (componentType) {
      addBuilderComponent(componentType, Math.round(x), Math.round(y));
    }
  };

  const applyMutation = useMutation({
    mutationFn: () =>
      createRecord<GatewayApplyResult>(`/gateway/apply/${applyTarget}`, {
        dry_run: !execute,
        execute,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/gateway/jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["/gateway/preview"] });
    },
  });

  const createPortal = useMutation({
    mutationFn: () =>
      createRecord("/gateway/portals", {
        portal_name: portalName,
        portal_host: portalHost,
        landing_path: portalLanding,
        success_path: portalSuccess,
        allowed_hosts: portalAllowedHosts.split(",").map((item) => item.trim()).filter(Boolean),
        welcome_message: portalWelcome || null,
        builder_config: portalBuilder,
        is_active: true,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/gateway/portals"] });
      await queryClient.invalidateQueries({ queryKey: ["/gateway/preview"] });
      setSelectedPortal(null);
    },
  });

  const updatePortal = useMutation({
    mutationFn: () =>
      updateRecord(`/gateway/portals/${selectedPortal?.id ?? 0}`, {
        portal_name: portalName,
        portal_host: portalHost,
        landing_path: portalLanding,
        success_path: portalSuccess,
        allowed_hosts: portalAllowedHosts.split(",").map((item) => item.trim()).filter(Boolean),
        welcome_message: portalWelcome || null,
        builder_config: portalBuilder,
        is_active: true,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/gateway/portals"] });
      await queryClient.invalidateQueries({ queryKey: ["/gateway/preview"] });
      setSelectedPortal(null);
    },
  });

  const createRadiusProfile = useMutation({
    mutationFn: () =>
      createRecord("/gateway/radius-profiles", {
        access_plan_id: Number(radiusPlanId || 0),
        profile_name: radiusProfileName,
        radius_group_name: radiusGroupName,
        reply_attributes: { "Framed-Protocol": "PPP" },
        is_default: false,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/gateway/radius-profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["/gateway/preview"] });
      setSelectedRadiusProfile(null);
    },
  });

  const updateRadiusProfile = useMutation({
    mutationFn: () =>
      updateRecord(`/gateway/radius-profiles/${selectedRadiusProfile?.id ?? 0}`, {
        access_plan_id: Number(radiusPlanId || 0),
        profile_name: radiusProfileName,
        radius_group_name: radiusGroupName,
        reply_attributes: { "Framed-Protocol": "PPP" },
        is_default: selectedRadiusProfile?.is_default ?? false,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/gateway/radius-profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["/gateway/preview"] });
      setSelectedRadiusProfile(null);
    },
  });

  const createNasDevice = useMutation({
    mutationFn: () =>
      createRecord("/gateway/nas-devices", {
        name: nasName,
        ip_address: nasIp,
        secret: nasSecret,
        short_name: nasShortName || null,
        enabled: true,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/gateway/nas-devices"] });
      await queryClient.invalidateQueries({ queryKey: ["/gateway/preview"] });
      setSelectedNasDevice(null);
    },
  });

  const updateNasDevice = useMutation({
    mutationFn: () =>
      updateRecord(`/gateway/nas-devices/${selectedNasDevice?.id ?? 0}`, {
        name: nasName,
        ip_address: nasIp,
        secret: nasSecret,
        short_name: nasShortName || null,
        enabled: selectedNasDevice?.enabled ?? true,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/gateway/nas-devices"] });
      await queryClient.invalidateQueries({ queryKey: ["/gateway/preview"] });
      setSelectedNasDevice(null);
    },
  });

  const deletePortal = useMutation({
    mutationFn: (id: number) => deleteRecord(`/gateway/portals/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/gateway/portals"] });
      await queryClient.invalidateQueries({ queryKey: ["/gateway/preview"] });
      setSelectedPortal(null);
    },
  });

  const deleteRadiusProfile = useMutation({
    mutationFn: (id: number) => deleteRecord(`/gateway/radius-profiles/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/gateway/radius-profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["/gateway/preview"] });
      setSelectedRadiusProfile(null);
    },
  });

  const deleteNasDevice = useMutation({
    mutationFn: (id: number) => deleteRecord(`/gateway/nas-devices/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/gateway/nas-devices"] });
      await queryClient.invalidateQueries({ queryKey: ["/gateway/preview"] });
      setSelectedNasDevice(null);
    },
  });

  const latestJob = jobs.data?.[0];
  const latestPreview = useMemo(() => preview.data, [preview.data]);
  const acceptedAttempts = attempts.data?.filter((attempt) => attempt.result === "accepted").length ?? 0;
  const activePortals = portals.data?.filter((portal) => portal.is_active).length ?? 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Portals" value={portals.data?.length ?? 0} hint={`${activePortals} active portal${activePortals === 1 ? "" : "s"}`} accent="blue" />
        <MetricCard label="Profiles" value={radiusProfiles.data?.length ?? 0} hint="FreeRADIUS policy rows" accent="green" />
        <MetricCard label="NAS" value={nasDevices.data?.length ?? 0} hint="Radius access devices" accent="purple" />
        <MetricCard label="Jobs" value={jobs.data?.length ?? 0} hint="Apply history records" accent="amber" />
        <MetricCard label="Attempts" value={attempts.data?.length ?? 0} hint={`${acceptedAttempts} accepted logins`} accent="red" />
        <MetricCard label="Status" value={latestJob?.status ?? "previewed"} hint={latestJob?.error_message ?? "No errors reported"} accent="blue" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <SectionCard subtitle="Gateway control" title="System preview">
          <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.06),transparent_58%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Live topology</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">Control plane snapshot</div>
                <div className="mt-1 text-sm text-slate-500">Preview generated from the current portal, radius, and firewall records.</div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  {activePortals} active portal{activePortals === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  {radiusProfiles.data?.length ?? 0} radius profiles
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  {nasDevices.data?.length ?? 0} NAS devices
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px_1fr] lg:items-center">
              <div className="space-y-4">
                <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-glow">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Portal</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{portals.data?.[0]?.portal_name ?? "default"}</div>
                  <div className="text-sm text-slate-500">{portals.data?.[0]?.portal_host ?? "portal.tinnicore.local"}</div>
                  <div className="mt-3 text-sm text-emerald-600">{portals.data?.[0]?.landing_path ?? "/login"}</div>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-glow">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Radius</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{radiusProfiles.data?.[0]?.profile_name ?? "guest-1h"}</div>
                  <div className="text-sm text-slate-500">{radiusProfiles.data?.[0]?.radius_group_name ?? "guest-1h"} · default policy</div>
                </div>
              </div>

              <div className="relative flex min-h-[18rem] items-center justify-center">
                <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
                <div className="absolute left-[12%] top-[32%] h-px w-[30%] -rotate-12 bg-gradient-to-r from-blue-300 to-emerald-300" />
                <div className="absolute right-[12%] top-[32%] h-px w-[30%] rotate-12 bg-gradient-to-l from-blue-300 to-emerald-300" />
                <div className="absolute bottom-[18%] left-[18%] h-px w-[28%] -rotate-3 bg-gradient-to-r from-blue-300 to-sky-300" />
                <div className="absolute bottom-[18%] right-[18%] h-px w-[28%] rotate-3 bg-gradient-to-l from-blue-300 to-sky-300" />
                <div className="relative flex h-56 w-56 flex-col items-center justify-center rounded-[34px] border border-blue-200 bg-white shadow-[0_20px_55px_rgba(37,99,235,0.12)]">
                  <div className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
                    TINNICORE
                  </div>
                  <div className="mt-4 text-2xl font-semibold text-slate-900">Gateway</div>
                  <div className="mt-1 text-sm text-slate-500">192.168.10.1</div>
                  <div className="mt-4 rounded-full bg-emerald-50 px-4 py-1 text-sm font-medium text-emerald-600">
                    {attempts.data?.length ?? 0} auth events
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-glow">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Firewall / NAT</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">Preview ready</div>
                  <div className="text-sm text-slate-500">Generated from the current policy set</div>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-glow">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Apply mode</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{execute ? "Execute" : "Dry run"}</div>
                  <div className="text-sm text-slate-500">{latestJob?.status ?? "previewed"} · gateway apply queue</div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard subtitle="Live state" title="Recent activity">
          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Portals</div>
              <div className="mt-3 space-y-3">
                {(portals.data ?? []).slice(0, 3).map((portal) => (
                  <div key={portal.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="font-semibold text-slate-900">{portal.portal_name}</div>
                    <div className="text-xs text-slate-500">
                      {portal.portal_host}
                      {portal.landing_path}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPortal(portal);
                          setPortalName(portal.portal_name);
                          setPortalHost(portal.portal_host);
                          setPortalLanding(portal.landing_path);
                          setPortalSuccess(portal.success_path);
                          setPortalAllowedHosts(portal.allowed_hosts.join(","));
                          setPortalWelcome(portal.welcome_message ?? "");
                          setPortalBuilder(clonePortalBuilderConfig(portal.builder_config));
                          setSelectedBuilderId(portal.builder_config?.components?.[0]?.id ?? "hero-title");
                        }}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePortal.mutate(portal.id)}
                        className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Radius Profiles</div>
              <div className="mt-3 space-y-3">
                {(radiusProfiles.data ?? []).slice(0, 3).map((profile) => (
                  <div key={profile.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="font-semibold text-slate-900">{profile.profile_name}</div>
                    <div className="text-xs text-slate-500">
                      {profile.radius_group_name} {profile.is_default ? "· default" : ""}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRadiusProfile(profile);
                          setRadiusProfileName(profile.profile_name);
                          setRadiusGroupName(profile.radius_group_name);
                          setRadiusPlanId(String(profile.access_plan_id));
                        }}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRadiusProfile.mutate(profile.id)}
                        className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Recent auth attempts</div>
              <div className="mt-3 space-y-2">
                {(attempts.data ?? []).slice(0, 5).map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium text-slate-900">{attempt.username}</div>
                      <div className="text-xs text-slate-500">
                        {attempt.auth_method} · {attempt.reason ?? attempt.result}
                      </div>
                    </div>
                    <div className={attempt.result === "accepted" ? "text-emerald-600" : "text-rose-600"}>{attempt.result}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard subtitle="Gateway control" title="Apply engine">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-600">Component</span>
              <select
                value={applyTarget}
                onChange={(event) => setApplyTarget(event.target.value as typeof applyTarget)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="radius">FreeRADIUS</option>
                <option value="hotspot">CoovaChilli</option>
                <option value="firewall">Firewall / NAT</option>
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input checked={execute} onChange={(event) => setExecute(event.target.checked)} type="checkbox" className="h-4 w-4 rounded border-slate-300 bg-white text-blue-600" />
              <span className="text-sm text-slate-700">Execute on server</span>
            </label>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <button
              type="button"
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-400 px-4 py-3 font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              Build apply plan
            </button>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Latest status</div>
              <div className="mt-2 font-semibold text-slate-900">{latestJob?.status ?? "previewed"}</div>
              <div className="text-xs text-slate-500">{latestJob?.error_message ?? "No errors reported"}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Jobs</div>
              <div className="mt-2 font-semibold text-slate-900">{jobs.data?.length ?? 0}</div>
              <div className="text-xs text-slate-500">Gateway apply history</div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <PreviewBlock config={latestPreview?.firewall} />
            <PreviewBlock config={latestPreview?.freeradius} />
            <PreviewBlock config={latestPreview?.hotspot} />
          </div>
        </SectionCard>

        <SectionCard subtitle="Hotspot" title="Portal">
          <div className="space-y-4">
            <Field label="Portal name" value={portalName} onChange={setPortalName} />
            <Field label="Portal host" value={portalHost} onChange={setPortalHost} />
            <Field label="Landing path" value={portalLanding} onChange={setPortalLanding} />
            <Field label="Success path" value={portalSuccess} onChange={setPortalSuccess} />
            <Field label="Allowed hosts" value={portalAllowedHosts} onChange={setPortalAllowedHosts} help="Comma separated hosts for UAM allow list." />
            <Field label="Welcome message" value={portalWelcome} onChange={setPortalWelcome} />
          </div>

          <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Portal studio</div>
                <div className="mt-1 text-sm text-slate-500">Drag blocks onto the canvas, change copy/colors, and preview the login page before saving.</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPortalBuilder(clonePortalBuilderConfig());
                  setSelectedBuilderId("login-card");
                }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Reset template
              </button>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[180px_1fr_260px]">
              <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Blocks</div>
                <div className="mt-4 space-y-2">
                  {(Object.keys(componentLabels) as PortalComponentType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("component-type", type)}
                      onClick={() => addBuilderComponent(type)}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      {componentLabels[type]}
                      <span className="text-blue-600">+</span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                ref={portalPreviewRef}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handlePortalCanvasDrop}
                className="relative min-h-[560px] overflow-hidden rounded-[28px] border border-slate-900 bg-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.25)]"
                style={{
                  backgroundColor: portalBuilder.theme.backgroundColor,
                  backgroundImage: portalBuilder.theme.backgroundImage
                    ? `linear-gradient(135deg, rgba(1,8,18,0.78), rgba(1,8,18,0.35)), url(${portalBuilder.theme.backgroundImage})`
                    : "radial-gradient(circle at 25% 25%, rgba(0,184,255,0.22), transparent 32%), radial-gradient(circle at 72% 12%, rgba(37,99,235,0.18), transparent 28%)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
                <div className="absolute left-6 top-6 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em]" style={{ color: portalBuilder.theme.textColor }}>
                  TINNICORE
                </div>
                {portalBuilder.components.map((component) => {
                  const selected = selectedBuilderId === component.id;
                  const baseClass = selected ? "ring-2 ring-cyan-300" : "ring-1 ring-white/10";
                  return (
                    <div
                      key={component.id}
                      draggable
                      onClick={() => setSelectedBuilderId(component.id)}
                      onDragStart={(event) => event.dataTransfer.setData("component-id", component.id)}
                      className={`absolute cursor-move rounded-[22px] p-4 backdrop-blur transition hover:ring-2 hover:ring-cyan-300 ${baseClass}`}
                      style={{
                        left: `${component.x}%`,
                        top: `${component.y}%`,
                        width: `${component.width}%`,
                        color: component.color,
                        background: component.background,
                        textAlign: component.align,
                        borderColor: selected ? portalBuilder.theme.accentColor : "rgba(255,255,255,0.12)",
                      }}
                    >
                      {component.type === "hero" ? <div className="text-3xl font-black leading-tight tracking-tight">{component.content}</div> : null}
                      {component.type === "text" ? <div className="text-sm leading-6">{component.content}</div> : null}
                      {component.type === "button" ? (
                        <div className="inline-flex rounded-full px-5 py-3 text-sm font-bold text-slate-950" style={{ backgroundColor: portalBuilder.theme.accentColor }}>
                          {component.content}
                        </div>
                      ) : null}
                      {component.type === "image" ? (
                        component.imageUrl ? <img src={component.imageUrl} alt={component.label} className="h-36 w-full rounded-2xl object-cover" /> : <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-white/25 text-sm">Image block</div>
                      ) : null}
                      {component.type === "login" ? (
                        <div>
                          <div className="text-lg font-bold">{component.content}</div>
                          <div className="mt-4 space-y-3">
                            <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs opacity-80">Username</div>
                            <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs opacity-80">Password</div>
                            <div className="rounded-xl px-3 py-2 text-center text-xs font-bold text-slate-950" style={{ backgroundColor: portalBuilder.theme.accentColor }}>
                              Connect
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {component.type === "voucher" ? (
                        <div>
                          <div className="text-base font-bold">{component.content}</div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 opacity-80">Code</div>
                            <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 opacity-80">PIN</div>
                          </div>
                        </div>
                      ) : null}
                      {component.type === "features" ? (
                        <div className="grid gap-2 text-xs font-semibold">
                          {component.content.split("|").filter(Boolean).map((item) => (
                            <div key={item} className="rounded-full border border-white/10 bg-white/10 px-3 py-2">
                              {item}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Theme</div>
                  <div className="mt-4 space-y-3">
                    <Field label="Background image URL" value={portalBuilder.theme.backgroundImage} onChange={(value) => patchBuilderTheme({ backgroundImage: value })} />
                    <Field label="Background color" value={portalBuilder.theme.backgroundColor} onChange={(value) => patchBuilderTheme({ backgroundColor: value })} />
                    <Field label="Accent color" value={portalBuilder.theme.accentColor} onChange={(value) => patchBuilderTheme({ accentColor: value })} />
                    <Field label="Text color" value={portalBuilder.theme.textColor} onChange={(value) => patchBuilderTheme({ textColor: value })} />
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Selected block</div>
                  {selectedBuilderComponent ? (
                    <div className="mt-4 space-y-3">
                      <Field label="Label" value={selectedBuilderComponent.label} onChange={(value) => patchBuilderComponent(selectedBuilderComponent.id, { label: value })} />
                      <Field label="Content" value={selectedBuilderComponent.content} onChange={(value) => patchBuilderComponent(selectedBuilderComponent.id, { content: value })} />
                      <div className="grid grid-cols-3 gap-2">
                        <Field label="X %" value={String(selectedBuilderComponent.x)} onChange={(value) => patchBuilderComponent(selectedBuilderComponent.id, { x: Number(value || 0) })} type="number" />
                        <Field label="Y %" value={String(selectedBuilderComponent.y)} onChange={(value) => patchBuilderComponent(selectedBuilderComponent.id, { y: Number(value || 0) })} type="number" />
                        <Field label="Width" value={String(selectedBuilderComponent.width)} onChange={(value) => patchBuilderComponent(selectedBuilderComponent.id, { width: Number(value || 10) })} type="number" />
                      </div>
                      <Field label="Text color" value={selectedBuilderComponent.color} onChange={(value) => patchBuilderComponent(selectedBuilderComponent.id, { color: value })} />
                      <Field label="Background" value={selectedBuilderComponent.background} onChange={(value) => patchBuilderComponent(selectedBuilderComponent.id, { background: value })} />
                      {selectedBuilderComponent.type === "image" ? (
                        <Field label="Image URL" value={selectedBuilderComponent.imageUrl ?? ""} onChange={(value) => patchBuilderComponent(selectedBuilderComponent.id, { imageUrl: value })} />
                      ) : null}
                      <label className="block">
                        <span className="mb-2 block text-sm text-slate-600">Alignment</span>
                        <select
                          value={selectedBuilderComponent.align}
                          onChange={(event) => patchBuilderComponent(selectedBuilderComponent.id, { align: event.target.value as PortalBuilderComponent["align"] })}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => deleteBuilderComponent(selectedBuilderComponent.id)}
                        className="w-full rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600"
                      >
                        Delete block
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-slate-500">Add a block to edit its settings.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => (selectedPortal ? updatePortal.mutate() : createPortal.mutate())}
            disabled={createPortal.isPending || updatePortal.isPending}
            className="mt-6 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-400 px-4 py-3 font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {selectedPortal ? "Update portal" : "Save portal"}
          </button>
          {selectedPortal ? (
            <button
              type="button"
              onClick={() => {
                setSelectedPortal(null);
                setPortalName("default");
                setPortalHost("portal.tinnicore.local");
                setPortalLanding("/login");
                setPortalSuccess("/status");
                setPortalAllowedHosts("127.0.0.1,localhost");
                setPortalWelcome("Welcome to TINNICORE Wi-Fi");
                setPortalBuilder(clonePortalBuilderConfig());
                setSelectedBuilderId("login-card");
              }}
              className="mt-3 rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700"
            >
              Cancel edit
            </button>
          ) : null}
        </SectionCard>

        <SectionCard subtitle="FreeRADIUS" title="Profile">
          <div className="space-y-4">
            <Field label="Profile name" value={radiusProfileName} onChange={setRadiusProfileName} />
            <Field label="Radius group name" value={radiusGroupName} onChange={setRadiusGroupName} />
            <Field label="Access plan id" value={radiusPlanId} onChange={setRadiusPlanId} type="number" help="Link to hotspot_access_plans.id." />
          </div>
          <button
            type="button"
            onClick={() => (selectedRadiusProfile ? updateRadiusProfile.mutate() : createRadiusProfile.mutate())}
            disabled={createRadiusProfile.isPending || updateRadiusProfile.isPending}
            className="mt-6 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-400 px-4 py-3 font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {selectedRadiusProfile ? "Update profile" : "Save profile"}
          </button>
          {selectedRadiusProfile ? (
            <button
              type="button"
              onClick={() => {
                setSelectedRadiusProfile(null);
                setRadiusProfileName("guest-1h");
                setRadiusGroupName("guest-1h");
                setRadiusPlanId("1");
              }}
              className="mt-3 rounded-2xl border border-white/10 px-4 py-3 font-semibold text-white"
            >
              Cancel edit
            </button>
          ) : null}
        </SectionCard>

        <SectionCard subtitle="Radius NAS" title="Device">
          <div className="space-y-4">
            <Field label="Device name" value={nasName} onChange={setNasName} />
            <Field label="IP address" value={nasIp} onChange={setNasIp} />
            <Field label="Shared secret" value={nasSecret} onChange={setNasSecret} type="password" />
            <Field label="Short name" value={nasShortName} onChange={setNasShortName} />
          </div>
          <button
            type="button"
            onClick={() => (selectedNasDevice ? updateNasDevice.mutate() : createNasDevice.mutate())}
            disabled={createNasDevice.isPending || updateNasDevice.isPending}
            className="mt-6 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-400 px-4 py-3 font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {selectedNasDevice ? "Update NAS" : "Save NAS"}
          </button>
          {selectedNasDevice ? (
            <button
              type="button"
              onClick={() => {
                setSelectedNasDevice(null);
                setNasName("advgate-local");
                setNasIp("127.0.0.1");
                setNasSecret("");
                setNasShortName("advgate");
              }}
              className="mt-3 rounded-2xl border border-white/10 px-4 py-3 font-semibold text-white"
            >
              Cancel edit
            </button>
          ) : null}
          <div className="mt-4 space-y-3">
            {(nasDevices.data ?? []).map((nas) => (
              <div key={nas.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="font-semibold text-white">{nas.name}</div>
                <div className="text-xs text-slate-400">
                  {nas.ip_address}
                  {nas.short_name ? ` · ${nas.short_name}` : ""}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNasDevice(nas);
                    setNasName(nas.name);
                    setNasIp(nas.ip_address);
                    setNasSecret(nas.secret);
                    setNasShortName(nas.short_name ?? "");
                  }}
                  className="mt-3 rounded-full border border-white/10 px-3 py-1 text-xs text-white"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteNasDevice.mutate(nas.id)}
                  className="ml-2 mt-3 rounded-full border border-rose-500/30 px-3 py-1 text-xs text-rose-200"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard subtitle="Apply history" title="Jobs">
          <div className="space-y-3">
            {(jobs.data ?? []).map((job) => (
              <div key={job.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{job.component}</div>
                    <div className="text-xs text-slate-500">
                      Job #{job.id} · {job.status} · {job.dry_run ? "dry-run" : "apply"}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{job.error_message ?? "ok"}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard subtitle="Recent output" title="Command plan">
          <div className="space-y-3">
            {(latestJob?.command_plan ?? []).map((step, index) => (
              <div key={`${step.command}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="font-medium text-slate-900">{step.description}</div>
                <div className="mt-1 text-xs text-slate-500">{step.command}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
