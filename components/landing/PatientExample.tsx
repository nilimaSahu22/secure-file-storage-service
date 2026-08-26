import { Heart, CalendarClock, FileUp, MessageCircleQuestion } from "lucide-react";

const PATIENT_FEATURES = [
  { icon: CalendarClock, label: "See upcoming and past appointments" },
  { icon: FileUp, label: "Upload reports directly to their own chart" },
  { icon: MessageCircleQuestion, label: "Ask questions about their own uploaded documents" },
];

export function PatientExample() {
  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div className="order-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:order-1">
            <ul className="flex flex-col gap-4">
              {PATIENT_FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50">
                    <f.icon size={16} className="text-blue-600" />
                  </div>
                  <span className="text-sm text-slate-700">{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 lg:order-2">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <Heart size={14} />
              For the patient
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">A portal built for patients, not clinicians</h2>
            <p className="mt-3 text-sm text-slate-600">
              A separate, simpler portal — patients see only their own records: their
              appointments, the documents they or their care team have uploaded, and a
              private conversation thread grounded in those same documents. Nothing from
              the clinician side is ever visible here.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
