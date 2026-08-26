import { Stethoscope, FileText } from "lucide-react";

export function ClinicianExample() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <Stethoscope size={14} />
            For the clinician
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">
            Ask the chart a question, get an answer with a source
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            The AI assistant sits right beside the chart, not in a separate tab. It only
            answers from documents actually on file for that patient — if a document
            doesn&apos;t cover the question, it says so instead of guessing.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex justify-end">
            <div className="max-w-xs rounded-lg rounded-br-none bg-blue-600 px-4 py-2 text-sm text-white">
              What was the discharge medication for the pneumonia admission?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-sm rounded-lg rounded-bl-none bg-slate-100 px-4 py-2 text-sm text-slate-800">
              Discharged on Amoxicillin 500mg, three times daily for 7 days, per the
              discharge summary.
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-blue-700">
                <FileText size={12} />
                Discharge Summary — Robert Nakamura
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
