"use client";

import { FormEvent, useState } from "react";
import { format } from "date-fns";
import { FileText, Plus, Sparkles } from "lucide-react";
import type { ClinicalNote, CodingSuggestion, StaffUser } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/chart/UnifiedChartView";
import { createNoteAction } from "@/lib/actions/notes";

type NoteWithExtras = ClinicalNote & { author: StaffUser; codingSuggestions: CodingSuggestion[] };

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
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setSuggestingFor(null);
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
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-slate-100 p-4 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium text-slate-900">{note.author.name}</p>
                <p className="text-xs text-slate-400">{format(note.createdAt, "MMM d, yyyy h:mm a")}</p>
              </div>
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <SoapField label="Subjective" value={note.subjective} />
                <SoapField label="Objective" value={note.objective} />
                <SoapField label="Assessment" value={note.assessment} />
                <SoapField label="Plan" value={note.plan} />
              </dl>

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

              {note.codingSuggestions.length === 0 && (
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
          ))}
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

          <SoapInput
            label="Subjective"
            value={subjective}
            onChange={setSubjective}
            quickFills={QUICK_FILL.subjective}
          />
          <SoapInput label="Objective" value={objective} onChange={setObjective} quickFills={QUICK_FILL.objective} />
          <SoapInput
            label="Assessment"
            value={assessment}
            onChange={setAssessment}
            quickFills={QUICK_FILL.assessment}
          />
          <SoapInput label="Plan" value={plan} onChange={setPlan} quickFills={QUICK_FILL.plan} />

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

function SoapField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-700">{value}</dd>
    </div>
  );
}

function SoapInput({
  label,
  value,
  onChange,
  quickFills,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  quickFills: readonly { label: string; text: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <div className="flex gap-1.5">
          {quickFills.map((qf) => (
            <button
              key={qf.label}
              type="button"
              onClick={() => onChange(value ? `${value} ${qf.text}` : qf.text)}
              className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 hover:border-blue-300 hover:text-blue-700"
            >
              {qf.label}
            </button>
          ))}
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        rows={3}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}
