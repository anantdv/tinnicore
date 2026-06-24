import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../shared/auth";

export default function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } } | undefined)?.from?.pathname ?? "/";

  return (
    <div className="min-h-full bg-mesh-grid px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex min-h-[40rem] flex-col justify-between rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-glow backdrop-blur">
          <div>
            <div className="text-xs uppercase tracking-[0.45em] text-slate-500">TINNICORE OS</div>
            <h1 className="mt-6 max-w-xl text-5xl font-black leading-[0.95] text-white md:text-7xl">
              Fast control for constrained gateway hardware.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-300">
              Manage hotspot users, firewall policy, WAN failover, licensing, and telemetry from a clean operator surface.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Low overhead", "Built for resource-limited appliances."],
              ["Production-shaped", "APIs, migrations, and auth are already structured."],
              ["Operator-first", "Fast screens for daily firewall and hotspot tasks."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="font-medium text-white">{title}</div>
                <div className="mt-2 text-sm text-slate-400">{copy}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center">
          <form
            className="w-full rounded-[32px] border border-white/10 bg-slate-900/90 p-8 shadow-glow"
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
            <div className="text-sm uppercase tracking-[0.35em] text-slate-500">Operator login</div>
            <h2 className="mt-3 text-3xl font-semibold text-white">Access the control plane</h2>
            <div className="mt-8 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-0 transition focus:border-ember-500"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Password</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-0 transition focus:border-ember-500"
                />
              </label>
            </div>
            {error ? <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}
            <button
              type="submit"
              className="mt-8 w-full rounded-2xl bg-gradient-to-r from-ember-500 to-amber-300 px-4 py-3 font-semibold text-slate-950 transition hover:opacity-95"
            >
              Sign in
            </button>
            <div className="mt-6 text-sm text-slate-400">
              Default development credentials: <span className="text-slate-200">admin / admin123</span>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
