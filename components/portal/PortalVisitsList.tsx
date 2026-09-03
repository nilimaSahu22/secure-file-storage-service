"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Download, Loader2, Stethoscope } from "lucide-react";
import type { PatientPortalData } from "@/lib/services/portal";
import { Card, CardTitle } from "@/components/ui/Card";
import { PatientSummaryRefresher } from "@/components/portal/PatientSummaryRefresher";

type Visit = PatientPortalData["visits"][number];

export function PortalVisitsList({ visits }: { visits: Visit[] }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  async function onDownload(visitId: string) {
    setDownloading(visitId);
    try {
      const res = await fetch(`/api/visits/${visitId}/prescription`);
      if (!res.ok) return;
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(null);
    }
  }

  if (visits.length === 0) {
    return (
      <Card>
        <CardTitle className="mb-2 flex items-center gap-1.5">
          <Stethoscope size={14} /> Your visits
        </CardTitle>
        <p className="text-sm text-slate-400">No visit summaries yet.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {visits.map((visit) => {
        const summary = visit.patientSummary;
        const needsSummary =
          !summary || summary.stale || (visit.note && summary.sourceNoteVersion !== visit.note.noteVersion);
        return (
          <Card key={visit.id}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-1.5">
                <Stethoscope size={14} /> Visit on{" "}
                {format(visit.signedAt ?? visit.startedAt, "MMM d, yyyy")}
              </CardTitle>
              {visit.prescriptionPdfKey && (
                <button
                  onClick={() => onDownload(visit.id)}
                  disabled={downloading === visit.id}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                >
                  {downloading === visit.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  Prescription (PDF)
                </button>
              )}
            </div>
            <p className="mb-3 text-xs text-slate-500">
              with {visit.author?.name ?? visit.signedBy?.name ?? "your care team"}
            </p>

            {needsSummary ? (
              <PatientSummaryRefresher visitId={visit.id} />
            ) : (
              <div className="flex flex-col gap-3 text-sm text-slate-700">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Visit summary</p>
                  <p className="whitespace-pre-wrap">{summary!.plainSummary}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Prescription</p>
                  <p className="whitespace-pre-wrap">{summary!.plainPrescription}</p>
                </div>
                {visit.prescription && visit.prescription.items.length > 0 && (
                  <ul className="flex flex-col gap-1 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    {visit.prescription.items.map((item) => (
                      <li key={item.id}>
                        <span className="font-medium text-slate-900">{item.medicationName}</span>{" "}
                        {[item.dose, item.route, item.frequency].filter(Boolean).join(" · ")}
                        {item.duration ? ` · ${item.duration}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
