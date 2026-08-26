import { Upload, ScanSearch, MessageCircleQuestion, CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    icon: Upload,
    title: "Upload",
    description: "Staff or patients upload reports, discharge summaries, and referrals to the chart.",
  },
  {
    icon: ScanSearch,
    title: "Index & Ground",
    description: "Text is extracted from each document so it can be referenced by exact source.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Ask",
    description: "Care teams and patients ask questions in plain language, right next to the chart.",
  },
  {
    icon: CheckCircle2,
    title: "Act",
    description: "Answers cite the source document — or say plainly when the documents don't cover it.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-slate-50 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-slate-900">How it works</h2>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                  {i + 1}
                </div>
                <s.icon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
