const STATS = [
  { value: "4.5 min", label: "avg. documentation time per note" },
  { value: "+14%", label: "coding accuracy on AI-suggested claims" },
  { value: "6.5 hrs", label: "provider hours saved per week" },
];

export function Hero() {
  return (
    <header className="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
        An EHR that thinks alongside your care team
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        Meridian pairs a unified patient chart with AI-assisted charting, coding, secure
        document storage, and grounded conversational answers — so your team spends less
        time hunting for information and more time on care.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <a
          href="#demo"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700"
        >
          Request a Demo
        </a>
        <a
          href="#how-it-works"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          See how it works
        </a>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 border-t border-slate-100 pt-8 sm:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.label}>
            <p className="text-2xl font-semibold text-slate-900">{s.value}</p>
            <p className="mt-1 text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
    </header>
  );
}
