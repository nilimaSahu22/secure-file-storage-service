"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { FileText, Plus, Sparkles, ShieldCheck, Download, Loader2, PenLine, ChevronDown, ChevronUp } from "lucide-react";
import type {
  ClinicalNote,
  CodingSuggestion,
  Prescription,
  PrescriptionItem,
  StaffUser,
  Visit,
} from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/chart/UnifiedChartView";
import { SoapField, SoapInput } from "@/components/chart/SoapInput";
import { createNoteAction } from "@/lib/actions/notes";

type VisitWithPrescription = Visit & {
  signedBy: StaffUser | null;
  prescription: (Prescription & { items: PrescriptionItem[] }) | null;
};

type NoteWithExtras = ClinicalNote & {
  author: StaffUser;
  codingSuggestions: CodingSuggestion[];
  visit: VisitWithPrescription | null;
};

interface NotesSectionProps {
  patientId: string;
  notes: NoteWithExtras[];
  staff: StaffUser[];
}

const QUICK_FILL = {
  subjective: [
    { label: "No new complaints", text: "Patient reports no new complaints since last visit." },
    { label: "Reports adherence", text: "Patient reports good adherence to current medication regimen." },
  ],
  objective: [
    { label: "Stable vitals", text: "Vitals within normal limits. No acute distress." },
    { label: "Unremarkable exam", text: "Physical exam unremarkable. No focal findings." },
  ],
  assessment: [
    { label: "Well controlled", text: "Condition stable and well controlled on current regimen." },
    { label: "Needs adjustment", text: "Condition suboptimally controlled, adjustment to management indicated." },
  ],
  plan: [
    { label: "Continue + follow up", text: "Continue current medications. Follow up in 3 months." },
    { label: "Adjust + recheck", text: "Adjust medication dosage. Recheck labs in 4-6 weeks." },
  ],
} as const;

export function NotesSection({ patientId, notes, staff }: NotesSectionProps) {
  const [open, setOpen] = useState(false);
  const [authorId, setAuthorId] = useState(staff[0]?.id ?? "");
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [suggestingFor, setSuggestingFor] = useState<string | null>(null);
  const [downloadingVisit, setDownloadingVisit] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createNoteAction({ patientId, authorId, subjective, objective, assessment, plan });
      setOpen(false);
      setSubjective("");
      setObjective("");
      setAssessment("");
      setPlan("");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSuggestCodes(noteId: string) {
    setSuggestingFor(noteId);
    try {
      const res = await fetch(`/api/suggest-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      if (res.ok) window.location.reload();
    } finally {
      setSuggestingFor(null);
    }
  }

  async function onDownloadPrescription(visitId: string) {
    setDownloadingVisit(visitId);
    try {
      const res = await fetch(`/api/visits/${visitId}/prescription`);
      if (!res.ok) return;
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingVisit(null);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-1.5">
          <FileText size={14} /> Clinical Notes
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus size={14} /> New Note
        </Button>
      </div>

      {notes.length === 0 ? (
        <EmptyState label="No notes on file." />
      ) : (
        <div className="flex flex-col gap-3">
          {(showAll ? notes : notes.slice(0, 1)).map((note) => {
            const visit = note.visit;
            const isDraftVisit = visit?.status === "DRAFT";
            const isSignedVisit = visit?.status === "SIGNED";
            return (
              <div key={note.id} className="rounded-lg border border-slate-100 p-4 text-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{note.author.name}</p>
                  <div className="flex items-center gap-2">
                    {isSignedVisit && (
                      <Badge tone="green">
                        <ShieldCheck size={11} className="mr-1 inline" /> Signed
                      </Badge>
                    )}
                    {isDraftVisit && <Badge tone="amber">Draft visit</Badge>}
                    <p className="text-xs text-slate-400">{format(note.createdAt, "MMM d, yyyy h:mm a")}</p>
                  </div>
                </div>

                {isDraftVisit ? (
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    This visit hasn&apos;t been signed.{" "}
                    <Link
                      href={`/dashboard/patients/${patientId}/visit/${visit!.id}/review`}
                      className="font-medium underline"
                    >
                      Finish in review
                    </Link>
                    .
                  </div>
                ) : (
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <SoapField label="Subjective" value={note.subjective} />
                    <SoapField label="Objective" value={note.objective} />
                    <SoapField label="Assessment" value={note.assessment} />
                    <SoapField label="Plan" value={note.plan} />
                  </dl>
                )}

                {isSignedVisit && visit?.prescription && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <PenLine size={11} /> Prescription
                      </p>
                      {visit.prescriptionPdfKey && (
                        <button
                          onClick={() => onDownloadPrescription(visit.id)}
                          disabled={downloadingVisit === visit.id}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          {downloadingVisit === visit.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Download size={12} />
                          )}
                          PDF
                        </button>
                      )}
                    </div>
                    {visit.prescription.items.length === 0 ? (
                      <p className="text-xs text-slate-500">No medications prescribed.</p>
                    ) : (
                      <ul className="flex flex-col gap-1 text-xs text-slate-700">
                        {visit.prescription.items.map((item) => (
                          <li key={item.id}>
                            <span className="font-medium text-slate-900">{item.medicationName}</span>{" "}
                            {[item.dose, item.route, item.frequency].filter(Boolean).join(" · ")}
                            {item.duration ? ` · ${item.duration}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                    {visit.prescription.investigations.length > 0 && (
                      <p className="mt-1.5 text-xs text-slate-500">
                        Investigations: {visit.prescription.investigations.join(", ")}
                      </p>
                    )}
                    {visit.prescription.followUpAt && (
                      <p className="mt-1 text-xs text-slate-500">
                        Follow-up: {format(visit.prescription.followUpAt, "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                )}

                {isSignedVisit && visit?.signatureStatement && (
                  <p className="mt-2 text-xs italic text-slate-400">{visit.signatureStatement}</p>
                )}

                {note.codingSuggestions.length > 0 && (
                  <div className="mt-3 rounded-lg bg-blue-50 p-3">
                    <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-blue-800">
                      <Sparkles size={11} /> AI-suggested codes — not validated
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {note.codingSuggestions.map((c) => (
                        <div key={c.id} className="text-xs text-slate-700">
                          <span className="font-medium text-slate-900">
                            {c.codeSystem} {c.code}
                          </span>{" "}
                          — {c.description}
                          <p className="text-slate-500">{c.rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isDraftVisit && note.codingSuggestions.length === 0 && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSuggestCodes(note.id)}
                      disabled={suggestingFor === note.id}
                    >
                      <Sparkles size={13} />
                      {suggestingFor === note.id ? "Suggesting…" : "Suggest Codes"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {notes.length > 1 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              {showAll ? (
                <>
                  <ChevronUp size={13} /> Show only the latest note
                </>
              ) : (
                <>
                  <ChevronDown size={13} /> Show {notes.length - 1} earlier note{notes.length - 1 > 1 ? "s" : ""}
                </>
              )}
            </button>
          )}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Clinical Note">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Select id="note-author" label="Author" value={authorId} onChange={(e) => setAuthorId(e.target.value)}>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          <SoapInput label="Subjective" value={subjective} onChange={setSubjective} quickFills={QUICK_FILL.subjective} required />
          <SoapInput label="Objective" value={objective} onChange={setObjective} quickFills={QUICK_FILL.objective} required />
          <SoapInput label="Assessment" value={assessment} onChange={setAssessment} quickFills={QUICK_FILL.assessment} required />
          <SoapInput label="Plan" value={plan} onChange={setPlan} quickFills={QUICK_FILL.plan} required />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save Note"}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
