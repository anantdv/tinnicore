import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createRecord, getList } from "../shared/api";

type LoginResponse = {
  accepted: boolean;
  method: string;
  message: string;
  username?: string | null;
  plan_name?: string | null;
  session_token?: string | null;
  voucher_code?: string | null;
  attempt_id?: number | null;
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

type PublicPortal = {
  id?: number;
  portal_name: string;
  welcome_message?: string | null;
  success_path: string;
  builder_config?: PortalBuilderConfig | null;
};

const fallbackBuilder: PortalBuilderConfig = {
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

export default function CaptivePortal() {
  const [method, setMethod] = useState<"user" | "voucher">("user");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<LoginResponse | null>(null);

  const portalQuery = useQuery<PublicPortal>({
    queryKey: ["/gateway/portal/public"],
    queryFn: () => getList("/gateway/portal/public"),
  });

  const builder = portalQuery.data?.builder_config ?? fallbackBuilder;

  const loginMutation = useMutation({
    mutationFn: (submitMethod: "user" | "voucher") =>
      createRecord<LoginResponse>("/gateway/hotspot/login", {
        method: submitMethod,
        username: submitMethod === "user" ? username : undefined,
        password: submitMethod === "user" ? password : undefined,
        voucher_code: submitMethod === "voucher" ? voucherCode : undefined,
        pin: submitMethod === "voucher" ? pin : undefined,
        client_ip: "0.0.0.0",
        client_mac: "00:00:00:00:00:00",
        nas_ip: "127.0.0.1",
      }),
    onSuccess: (data) => setMessage(data),
  });

  const loginForm = (title: string, preferredMethod: "user" | "voucher") => (
    <div>
      <div className="text-lg font-bold">{title}</div>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => setMethod("user")} className={`rounded-full px-3 py-1 text-xs font-bold ${method === "user" ? "text-slate-950" : "border border-white/15 text-white/80"}`} style={method === "user" ? { backgroundColor: builder.theme.accentColor } : undefined}>
          User
        </button>
        <button type="button" onClick={() => setMethod("voucher")} className={`rounded-full px-3 py-1 text-xs font-bold ${method === "voucher" ? "text-slate-950" : "border border-white/15 text-white/80"}`} style={method === "voucher" ? { backgroundColor: builder.theme.accentColor } : undefined}>
          Voucher
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {(preferredMethod === "user" ? method : "voucher") === "user" ? (
          <>
            <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-white/45" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-white/45" />
          </>
        ) : (
          <>
            <input value={voucherCode} onChange={(event) => setVoucherCode(event.target.value)} placeholder="Voucher code" className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-white/45" />
            <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" placeholder="PIN" className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-white/45" />
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setMethod(preferredMethod === "voucher" ? "voucher" : method);
            loginMutation.mutate(preferredMethod === "voucher" ? "voucher" : method);
          }}
          className="w-full rounded-xl px-3 py-3 text-sm font-black text-slate-950"
          style={{ backgroundColor: builder.theme.accentColor }}
        >
          Connect
        </button>
        {message ? (
          <div className={`rounded-xl border px-3 py-2 text-xs ${message.accepted ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100" : "border-rose-300/40 bg-rose-400/10 text-rose-100"}`}>
            <div className="font-bold">{message.message}</div>
            <div className="mt-1 opacity-80">
              {message.accepted ? `Session ${message.session_token ?? "created"}${message.plan_name ? ` · ${message.plan_name}` : ""}` : `Attempt ${message.attempt_id ?? "logged"}`}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        backgroundColor: builder.theme.backgroundColor,
        backgroundImage: builder.theme.backgroundImage
          ? `linear-gradient(135deg, rgba(1,8,18,0.78), rgba(1,8,18,0.35)), url(${builder.theme.backgroundImage})`
          : "radial-gradient(circle at 25% 25%, rgba(0,184,255,0.22), transparent 32%), radial-gradient(circle at 72% 12%, rgba(37,99,235,0.18), transparent 28%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="absolute left-6 top-6 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em]" style={{ color: builder.theme.textColor }}>
        TINNICORE
      </div>
      <div className="relative min-h-screen p-6">
        {builder.components.map((component) => (
          <div
            key={component.id}
            className="absolute rounded-[24px] p-5 backdrop-blur"
            style={{
              left: `${component.x}%`,
              top: `${component.y}%`,
              width: `${component.width}%`,
              color: component.color,
              background: component.background,
              textAlign: component.align,
              border: component.background === "transparent" ? "0" : "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {component.type === "hero" ? <div className="text-4xl font-black leading-tight tracking-tight md:text-6xl">{component.content}</div> : null}
            {component.type === "text" ? <div className="text-base leading-7 md:text-lg">{component.content}</div> : null}
            {component.type === "button" ? (
              <button type="button" onClick={() => loginMutation.mutate(method)} className="rounded-full px-6 py-3 text-sm font-black text-slate-950" style={{ backgroundColor: builder.theme.accentColor }}>
                {component.content}
              </button>
            ) : null}
            {component.type === "image" ? (
              component.imageUrl ? <img src={component.imageUrl} alt={component.label} className="max-h-64 w-full rounded-2xl object-cover" /> : <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-white/25 text-sm">Image block</div>
            ) : null}
            {component.type === "login" ? loginForm(component.content, "user") : null}
            {component.type === "voucher" ? loginForm(component.content, "voucher") : null}
            {component.type === "features" ? (
              <div className="grid gap-2 text-sm font-semibold">
                {component.content.split("|").filter(Boolean).map((item) => (
                  <div key={item} className="rounded-full border border-white/10 bg-white/10 px-4 py-3">
                    {item}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
