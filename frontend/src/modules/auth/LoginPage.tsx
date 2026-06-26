import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/auth";

export default function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } } | undefined)?.from?.pathname ?? "/";

  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setCurrentTime(
        `${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })} | ${date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`,
      );
    };

    updateTime();
    const interval = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="min-h-full bg-mesh-grid px-4 py-5 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="glass-panel flex flex-col gap-4 rounded-[28px] border border-blue-900/30 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-900/30 bg-gradient-to-br from-blue-500 to-cyan-400 text-xl font-black text-white shadow-[0_16px_30px_rgba(37,99,235,0.2)]">
              T
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-white">
                TINNI<span className="text-blue-400">CORE</span>
              </div>
              <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Network. Secure. Connect.</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/30 bg-[#081223] px-4 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              SYSTEM: <span className="font-semibold text-emerald-400">ONLINE</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/30 bg-[#081223] px-4 py-2 font-mono">
              {currentTime || "10:42:31 AM | May 20, 2025"}
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="glass-panel overflow-hidden rounded-[32px] border border-blue-900/30">
            <div className="relative min-h-[38rem] p-8 lg:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(25,184,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.12),transparent_28%)]" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/30 bg-[#081223] px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-blue-300">
                    Command Center
                  </div>
                  <div className="max-w-2xl">
                    <h1 className="text-5xl font-black leading-[0.94] tracking-tight text-white md:text-7xl">
                      Fast control for constrained gateway hardware.
                    </h1>
                    <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                      Manage hotspot users, firewall policy, WAN failover, licensing, and telemetry from a clean operator surface.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    ["Low overhead", "Built for resource-limited appliances."],
                    ["Production-shaped", "APIs, migrations, and auth are already structured."],
                    ["Operator-first", "Fast screens for daily firewall and hotspot tasks."],
                  ].map(([title, copy]) => (
                    <div key={title} className="rounded-[22px] border border-blue-900/30 bg-[#081223] p-4">
                      <div className="mb-3 h-2 w-14 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
                      <div className="font-semibold text-white">{title}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">{copy}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-[24px] border border-blue-900/30 bg-[#081223] p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Device</div>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-white shadow-[0_14px_28px_rgba(37,99,235,0.18)]">
                        ⌂
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-white">TINNICORE 150</div>
                        <div className="text-sm text-slate-400">Gateway control plane</div>
                        <div className="mt-2 text-sm font-medium text-emerald-400">Online</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-blue-900/30 bg-[#081223] p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Uptime</div>
                    <div className="mt-4 text-3xl font-black text-white">7D 14H 22M</div>
                    <div className="mt-2 text-sm text-slate-400">Since May 13, 2025 08:20 AM</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center">
            <form
              className="glass-panel w-full rounded-[32px] border border-blue-900/30 p-8 lg:p-10"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  setError(null);
                  await signIn(username, password);
                  navigate(from, { replace: true });
                } catch {
                  setError("Login failed. Check the backend is running and the credentials are correct.");
                }
              }}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-300">Operator login</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Access the control plane</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">Use the admin credentials provided for this development build.</p>

              <div className="mt-8 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Username</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-2xl border border-blue-900/30 bg-[#081223] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Password</span>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    className="w-full rounded-2xl border border-blue-900/30 bg-[#081223] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
                  />
                </label>
              </div>

              {error ? <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}

              <button
                type="submit"
                className="mt-8 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-400 px-4 py-3 font-semibold text-white transition hover:opacity-95"
              >
                Sign in
              </button>

              <div className="mt-6 rounded-[24px] border border-blue-900/30 bg-[#081223] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Default credentials</div>
                <div className="mt-2 text-sm text-slate-300">
                  <span className="font-semibold text-white">admin</span> / <span className="font-semibold text-white">admin123</span>
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
