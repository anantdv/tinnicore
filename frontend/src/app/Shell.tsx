import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { createRecord, deleteRecord, getDashboard, getList, updateRecord } from "../shared/api";
import { useAuth } from "../shared/auth";
import type { DashboardSummary, User } from "../shared/types";
import type { CrudConfig, FormField } from "../shared/forms";

type Keyed = { id: number };

const navItems = [
  ["Dashboard", "/"],
  ["Users", "/users"],
  ["Plans", "/plans"],
  ["Vouchers", "/vouchers"],
  ["Sessions", "/sessions"],
  ["Network", "/network"],
  ["WAN", "/wan"],
  ["Firewall", "/firewall"],
  ["License", "/license"],
  ["Firmware", "/firmware"],
  ["Telemetry", "/telemetry"],
];

function Metric({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur">
      <div className="text-xs uppercase tracking-[0.35em] text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm text-slate-400">{hint}</div>
    </div>
  );
}

function DashboardPage() {
  const dashboard = useQuery<DashboardSummary>({ queryKey: ["dashboard"], queryFn: getDashboard });
  const summary = dashboard.data;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Online Users" value={summary?.online_users ?? "--"} hint="Connected right now" />
        <Metric label="Active Sessions" value={summary?.active_sessions ?? "--"} hint="Hotspot leases in use" />
        <Metric label="Data Usage" value={`${summary?.total_data_usage_mb ?? "--"} MB`} hint="Estimated traffic volume" />
        <Metric label="WAN" value={summary?.wan_status?.status ?? "--"} hint={summary?.wan_status?.name ?? "wan0"} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Bandwidth</h2>
              <p className="text-sm text-slate-400">Last 7 days of throughput</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary?.bandwidth_usage ?? []}>
                <defs>
                  <linearGradient id="down" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#ff7b54" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#ff7b54" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="up" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Area type="monotone" dataKey="down" stroke="#ff7b54" fill="url(#down)" />
                <Area type="monotone" dataKey="up" stroke="#60a5fa" fill="url(#up)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
          <h2 className="text-lg font-semibold text-white">System Health</h2>
          <div className="mt-5 space-y-4 text-sm">
            {summary &&
              Object.entries(summary.system_health).map(([key, value]) => {
                const percent = Number(value);
                return (
                  <div key={key}>
                    <div className="mb-1 flex justify-between text-slate-300">
                      <span className="capitalize">{key}</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-gradient-to-r from-ember-500 to-amber-300" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
            <div className="font-medium text-white">Device</div>
            <div className="mt-2 grid gap-2">
              <div>{summary?.device_info.product}</div>
              <div>Firmware {summary?.device_info.firmware}</div>
              <div>License {summary?.device_info.license}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow">
        <h2 className="text-lg font-semibold text-white">Recent Alerts</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(summary?.recent_alerts ?? []).map((alert, index) => (
            <div key={`${alert.message}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{alert.severity}</div>
              <div className="mt-2 text-sm text-white">{alert.message}</div>
              <div className="mt-2 text-xs text-slate-400">{alert.status}</div>
            </div>
          ))}
        </div>
      </section>
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
      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
        <input
          checked={value === "true"}
          onChange={(event) => onChange(event.target.checked ? "true" : "false")}
          type="checkbox"
          className="h-4 w-4 rounded border-white/20 bg-slate-900 text-ember-500"
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
        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-ember-500"
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
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">{config.title}</h1>
              <p className="mt-1 text-sm text-slate-400">{selected ? "Edit the selected record" : config.createLabel}</p>
            </div>
            {selected ? (
              <button type="button" onClick={reset} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
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
              className="rounded-2xl bg-gradient-to-r from-ember-500 to-amber-300 px-4 py-3 font-semibold text-slate-950 transition hover:opacity-95 disabled:opacity-60"
            >
              {selected ? "Save changes" : config.createLabel}
            </button>
          </div>

          {selectedMap ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs text-slate-300">
              <div className="mb-2 font-semibold text-white">Selected record</div>
              <pre className="overflow-auto whitespace-pre-wrap">{JSON.stringify(selectedMap, null, 2)}</pre>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Records</h2>
              <p className="text-sm text-slate-400">{rows.length} item(s)</p>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-white/5 text-left text-slate-300">
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
                    <tr key={item.id} className="border-t border-white/10">
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
                            className="rounded-full border border-white/10 px-3 py-1 text-xs text-white"
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
  rule_name: string;
  action: string;
  source: string | null;
  destination: string | null;
  protocol: string | null;
  port: string | null;
  enabled: boolean;
};

function UsersPage() {
  return (
    <CrudPage<UserItem>
      config={{
        title: "Users",
        path: "/users",
        createLabel: "Create user",
        fields: [
          { name: "username", label: "Username" },
          { name: "email", label: "Email" },
          { name: "full_name", label: "Full Name" },
          { name: "password", label: "Password", type: "password" },
          { name: "is_admin", label: "Admin", type: "checkbox" },
        ],
        defaultValues: { is_admin: "false" },
        updatePath: (item) => `/users/${item.id}`,
        deletePath: (item) => `/users/${item.id}`,
        buildCreatePayload: (values) => ({
          username: values.username,
          email: values.email,
          full_name: values.full_name || null,
          password: values.password,
          is_admin: values.is_admin === "true",
        }),
        buildUpdatePayload: (values, selected) => ({
          email: values.email || null,
          full_name: values.full_name || null,
          password: values.password || undefined,
          is_active: selected.is_active,
          is_admin: values.is_admin === "true",
        }),
        renderItem: (item) => ({
          username: item.username,
          email: item.email,
          full_name: item.full_name ?? "",
          password: "",
          is_admin: item.is_admin ? "true" : "false",
        }),
      }}
    />
  );
}

function PlansPage() {
  return (
    <CrudPage<PlanItem>
      config={{
        title: "Access Plans",
        path: "/plans",
        createLabel: "Create plan",
        fields: [
          { name: "plan_name", label: "Plan Name" },
          { name: "download_kbps", label: "Download Kbps", type: "number" },
          { name: "upload_kbps", label: "Upload Kbps", type: "number" },
          { name: "max_duration_minutes", label: "Max Duration", type: "number" },
          { name: "status", label: "Status" },
        ],
        updatePath: (item) => `/plans/${item.id}`,
        deletePath: (item) => `/plans/${item.id}`,
        buildCreatePayload: (values) => ({
          plan_name: values.plan_name,
          download_kbps: Number(values.download_kbps || 0),
          upload_kbps: Number(values.upload_kbps || 0),
          max_duration_minutes: values.max_duration_minutes ? Number(values.max_duration_minutes) : null,
          status: values.status || "active",
        }),
        buildUpdatePayload: (values) => ({
          plan_name: values.plan_name || undefined,
          download_kbps: values.download_kbps ? Number(values.download_kbps) : undefined,
          upload_kbps: values.upload_kbps ? Number(values.upload_kbps) : undefined,
          max_duration_minutes: values.max_duration_minutes ? Number(values.max_duration_minutes) : null,
          status: values.status || undefined,
        }),
        renderItem: (item) => ({
          plan_name: item.plan_name,
          download_kbps: item.download_kbps,
          upload_kbps: item.upload_kbps,
          max_duration_minutes: item.max_duration_minutes ?? "",
          status: item.status,
        }),
      }}
    />
  );
}

function VouchersPage() {
  const queryClient = useQueryClient();
  const batches = useQuery<VoucherBatch[]>({ queryKey: ["/vouchers/batches"], queryFn: () => getList<VoucherBatch[]>("/vouchers/batches") });
  const vouchers = useQuery<VoucherItem[]>({ queryKey: ["/vouchers"], queryFn: () => getList<VoucherItem[]>("/vouchers") });
  const [batchName, setBatchName] = useState("Guest Batch");
  const [codePrefix, setCodePrefix] = useState("GUEST");
  const [quantity, setQuantity] = useState("10");
  const [expiresAt, setExpiresAt] = useState("");

  const createBatch = useMutation({
    mutationFn: () =>
      createRecord("/vouchers/batches", {
        batch_name: batchName,
        code_prefix: codePrefix,
        quantity: Number(quantity || 0),
        expires_at: expiresAt || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/vouchers/batches"] });
      await queryClient.invalidateQueries({ queryKey: ["/vouchers"] });
    },
  });

  const toggleVoucher = useMutation({
    mutationFn: ({ id, blocked }: { id: number; blocked: boolean }) =>
      createRecord(`/vouchers/${id}/${blocked ? "unblock" : "block"}`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/vouchers"] });
    },
  });

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow">
          <h1 className="text-2xl font-semibold text-white">Vouchers</h1>
          <p className="mt-1 text-sm text-slate-400">Create voucher batches and manage generated codes.</p>

          <div className="mt-6 space-y-4">
            <InputField field={{ name: "batch_name", label: "Batch Name" }} value={batchName} onChange={setBatchName} />
            <InputField field={{ name: "code_prefix", label: "Code Prefix" }} value={codePrefix} onChange={setCodePrefix} />
            <InputField field={{ name: "quantity", label: "Quantity", type: "number" }} value={quantity} onChange={setQuantity} />
            <InputField field={{ name: "expires_at", label: "Expires At" }} value={expiresAt} onChange={setExpiresAt} />
          </div>

          <button
            type="button"
            onClick={() => createBatch.mutate()}
            className="mt-6 rounded-2xl bg-gradient-to-r from-ember-500 to-amber-300 px-4 py-3 font-semibold text-slate-950"
          >
            Create batch
          </button>

          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
            <div className="font-medium text-white">Batches</div>
            <div className="mt-2 space-y-2">
              {(batches.data ?? []).map((batch) => (
                <div key={batch.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="font-medium text-white">{batch.batch_name}</div>
                  <div className="text-xs text-slate-400">
                    {batch.code_prefix} · {batch.quantity} codes · {batch.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow">
          <h2 className="text-lg font-semibold text-white">Voucher Codes</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-white/5 text-left text-slate-300">
                <tr>
                  <th className="px-3 py-3 font-medium">Code</th>
                  <th className="px-3 py-3 font-medium">PIN</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(vouchers.data ?? []).map((voucher) => (
                  <tr key={voucher.id} className="border-t border-white/10">
                    <td className="px-3 py-3 text-slate-200">{voucher.code}</td>
                    <td className="px-3 py-3 text-slate-200">{voucher.pin}</td>
                    <td className="px-3 py-3 text-slate-200">{voucher.status}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleVoucher.mutate({ id: voucher.id, blocked: voucher.status === "blocked" })}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs text-white"
                      >
                        {voucher.status === "blocked" ? "Unblock" : "Block"}
                      </button>
                    </td>
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
  const [zoneName, setZoneName] = useState("guest");
  const [zonePolicy, setZonePolicy] = useState("drop");
  const [zoneInterfaces, setZoneInterfaces] = useState("lan0");
  const [ruleName, setRuleName] = useState("Allow DNS");
  const [ruleAction, setRuleAction] = useState("accept");
  const [ruleZoneId, setRuleZoneId] = useState("1");
  const [ruleProtocol, setRuleProtocol] = useState("udp");
  const [rulePort, setRulePort] = useState("53");

  const createZone = useMutation({
    mutationFn: () =>
      createRecord("/firewall/zones", {
        name: zoneName,
        policy: zonePolicy,
        interfaces: toggleList(zoneInterfaces),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/firewall/zones"] });
    },
  });

  const createRule = useMutation({
    mutationFn: () =>
      createRecord("/firewall/rules", {
        zone_id: Number(ruleZoneId || 0),
        rule_name: ruleName,
        action: ruleAction,
        protocol: ruleProtocol,
        port: rulePort,
        enabled: true,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/firewall/rules"] });
    },
  });

  const deleteZone = useMutation({
    mutationFn: (zone: FirewallZone) => deleteRecord(`/firewall/zones/${zone.id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/firewall/zones"] });
    },
  });

  const deleteRule = useMutation({
    mutationFn: (rule: FirewallRule) => deleteRecord(`/firewall/rules/${rule.id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/firewall/rules"] });
    },
  });

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow">
          <h1 className="text-2xl font-semibold text-white">Firewall Zones</h1>
          <div className="mt-4 space-y-4">
            <InputField field={{ name: "zone_name", label: "Zone Name" }} value={zoneName} onChange={setZoneName} />
            <InputField field={{ name: "zone_policy", label: "Policy" }} value={zonePolicy} onChange={setZonePolicy} />
            <InputField field={{ name: "zone_interfaces", label: "Interfaces" }} value={zoneInterfaces} onChange={setZoneInterfaces} />
          </div>
          <button type="button" onClick={() => createZone.mutate()} className="mt-6 rounded-2xl bg-gradient-to-r from-ember-500 to-amber-300 px-4 py-3 font-semibold text-slate-950">
            Create zone
          </button>

          <div className="mt-6 space-y-3">
            {(zones.data ?? []).map((zone) => (
              <div key={zone.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{zone.name}</div>
                    <div className="text-xs text-slate-400">
                      Policy {zone.policy} · {zone.interfaces?.join(", ") || "no interfaces"}
                    </div>
                  </div>
                  <button type="button" onClick={() => deleteZone.mutate(zone)} className="rounded-full border border-red-500/30 px-3 py-1 text-xs text-red-200">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow">
          <h2 className="text-lg font-semibold text-white">Firewall Rules</h2>
          <div className="mt-4 space-y-4">
            <InputField field={{ name: "rule_name", label: "Rule Name" }} value={ruleName} onChange={setRuleName} />
            <InputField field={{ name: "rule_action", label: "Action" }} value={ruleAction} onChange={setRuleAction} />
            <InputField field={{ name: "rule_zone_id", label: "Zone ID", type: "number" }} value={ruleZoneId} onChange={setRuleZoneId} />
            <InputField field={{ name: "rule_protocol", label: "Protocol" }} value={ruleProtocol} onChange={setRuleProtocol} />
            <InputField field={{ name: "rule_port", label: "Port" }} value={rulePort} onChange={setRulePort} />
          </div>
          <button type="button" onClick={() => createRule.mutate()} className="mt-6 rounded-2xl bg-gradient-to-r from-ember-500 to-amber-300 px-4 py-3 font-semibold text-slate-950">
            Create rule
          </button>

          <div className="mt-6 space-y-3">
            {(rules.data ?? []).map((rule) => (
              <div key={rule.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{rule.rule_name}</div>
                    <div className="text-xs text-slate-400">
                      {rule.action} · {rule.protocol ?? "any"}:{rule.port ?? "any"} · zone {rule.zone_id}
                    </div>
                  </div>
                  <button type="button" onClick={() => deleteRule.mutate(rule)} className="rounded-full border border-red-500/30 px-3 py-1 text-xs text-red-200">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SimpleListPage({ path, title }: { path: string; title: string }) {
  const query = useQuery({ queryKey: [path], queryFn: () => getList(path) });
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow">
      <h1 className="text-2xl font-semibold text-white">{title}</h1>
      <pre className="mt-4 overflow-auto rounded-2xl bg-slate-950/70 p-4 text-xs text-slate-300">{JSON.stringify(query.data ?? [], null, 2)}</pre>
    </div>
  );
}

export default function Shell() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-full bg-mesh-grid">
      <div className="mx-auto flex min-h-full max-w-[1600px] gap-6 p-4 md:p-6">
        <aside className="hidden w-72 shrink-0 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur xl:block">
          <div className="rounded-3xl bg-gradient-to-br from-ember-500 to-amber-300 p-5 text-slate-950">
            <div className="text-xs font-semibold uppercase tracking-[0.35em]">TINNICORE OS</div>
            <div className="mt-3 text-2xl font-black leading-tight">Gateway Control Plane</div>
          </div>
          <nav className="mt-6 space-y-1">
            {navItems.map(([label, to]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `block rounded-2xl px-4 py-3 text-sm transition ${
                    isActive ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
                end={to === "/"}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 space-y-6">
          <header className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-glow backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.4em] text-slate-500">Operational view</div>
                <div className="mt-1 text-2xl font-semibold text-white">Welcome, {user?.full_name ?? user?.username}</div>
              </div>
              <button onClick={signOut} className="rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-white transition hover:bg-slate-800">
                Sign out
              </button>
            </div>
          </header>

          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/vouchers" element={<VouchersPage />} />
            <Route path="/sessions" element={<SimpleListPage path="/sessions/active" title="Sessions" />} />
            <Route path="/network" element={<SimpleListPage path="/network/interfaces" title="Network Interfaces" />} />
            <Route path="/wan" element={<SimpleListPage path="/wan/interfaces" title="WAN" />} />
            <Route path="/firewall" element={<FirewallPage />} />
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
