export default function CaptivePortal() {
  return (
    <div className="flex min-h-full items-center justify-center bg-mesh-grid p-6 text-center">
      <div className="max-w-xl rounded-[32px] border border-white/10 bg-white/5 p-10 shadow-glow backdrop-blur">
        <div className="text-xs uppercase tracking-[0.45em] text-slate-500">Captive Portal</div>
        <h1 className="mt-4 text-4xl font-black text-white">Welcome to the network</h1>
        <p className="mt-4 text-slate-300">
          This placeholder captive portal is ready for authentication, vouchers, or branded access flows in the next iteration.
        </p>
      </div>
    </div>
  );
}
