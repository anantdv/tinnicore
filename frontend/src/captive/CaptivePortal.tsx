import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createRecord } from "../shared/api";

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

export default function CaptivePortal() {
  const [method, setMethod] = useState<"user" | "voucher">("user");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<LoginResponse | null>(null);

  const loginMutation = useMutation({
    mutationFn: () =>
      createRecord<LoginResponse>("/gateway/hotspot/login", {
        method,
        username: method === "user" ? username : undefined,
        password: method === "user" ? password : undefined,
        voucher_code: method === "voucher" ? voucherCode : undefined,
        pin: method === "voucher" ? pin : undefined,
        client_ip: "0.0.0.0",
        client_mac: "00:00:00:00:00:00",
        nas_ip: "127.0.0.1",
      }),
    onSuccess: (data) => setMessage(data),
  });

  return (
    <div className="min-h-full bg-mesh-grid px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-slate-200 bg-white p-8 shadow-glow md:p-10">
          <div className="text-xs font-semibold uppercase tracking-[0.45em] text-blue-600">Captive Portal</div>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Welcome to the network</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            This portal now talks to the gateway login API. Use username/password or voucher/PIN to simulate a hotspot authentication flow.
          </p>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={() => setMethod("user")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${method === "user" ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600"}`}
            >
              Username login
            </button>
            <button
              type="button"
              onClick={() => setMethod("voucher")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${method === "voucher" ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600"}`}
            >
              Voucher login
            </button>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
            <div className="space-y-4">
              {method === "user" ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Username</span>
                    <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-500" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                    <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-500" />
                  </label>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Voucher Code</span>
                    <input value={voucherCode} onChange={(event) => setVoucherCode(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-500" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">PIN</span>
                    <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-500" />
                  </label>
                </>
              )}

              <button
                type="button"
                onClick={() => loginMutation.mutate()}
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-400 px-5 py-3 font-semibold text-white transition hover:opacity-95"
              >
                Connect
              </button>

              {message ? (
                <div className={`rounded-2xl border p-4 text-sm ${message.accepted ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                  <div className="font-semibold">{message.message}</div>
                  <div className="mt-1 text-xs">
                    {message.accepted ? `Session ${message.session_token ?? "created"}${message.plan_name ? ` · ${message.plan_name}` : ""}` : `Attempt ${message.attempt_id ?? "logged"}`}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Network access</div>
              <div className="mt-3 space-y-3 text-sm text-slate-600">
                <div>Use your assigned hotspot account or a voucher code.</div>
                <div>The backend now records each attempt and can create a session token on success.</div>
                <div>Next step will be redirecting successful sessions to the operator-approved landing page.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
