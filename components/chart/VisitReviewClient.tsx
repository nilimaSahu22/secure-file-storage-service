"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SoapInput } from "@/components/chart/SoapInput";
import { checkDrugAllergyConflicts } from "@/lib/clinical/rules";
import { saveVisitDraftAction, signVisitAction } from "@/lib/actions/visits";
import type { UpdateDraftVisitInput } from "@/lib/services/visits";

interface ItemState {
  medicationName: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface VisitReviewClientProps {
  patientId: string;
  visitId: string;
  patientName: string;
  allergies: { allergen: string }[];
  note: { subjective: string; objective: string; assessment: string; plan: string };
  prescription: {
    items: ItemState[];
    investigations: string[];
    advice: string;
    followUpAt: string;
  };
}

const EMPTY_ITEM: ItemState = { medicationName: "", dose: "", route: "", frequency: "", duration: "", instructions: "" };

export function VisitReviewClient({
  patientId,
  visitId,
  patientName,
  allergies,
  note,
  prescription,
}: VisitReviewClientProps) {
  const router = useRouter();

  const [subjective, setSubjective] = useState(note.subjective);
  const [objective, setObjective] = useState(note.objective);
  const [assessment, setAssessment] = useState(note.assessment);
  const [plan, setPlan] = useState(note.plan);

  const [items, setItems] = useState<ItemState[]>(
    prescription.items.length ? prescription.items : [{ ...EMPTY_ITEM }]
  );
  const [investigations, setInvestigations] = useState(prescription.investigations.join("\n"));
  const [advice, setAdvice] = useState(prescription.advice);
  const [followUpAt, setFollowUpAt] = useState(prescription.followUpAt);

  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function updateItem(index: number, patch: Partial<ItemState>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
    setSavedAt(null);
  }
  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }
  function removeItem(index: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function buildInput(): UpdateDraftVisitInput {
    return {
      soap: { subjective, objective, assessment, plan },
      prescription: {
        items: items
          .filter((it) => it.medicationName.trim())
          .map((it) => ({
            medicationName: it.medicationName.trim(),
            dose: it.dose.trim(),
            route: it.route.trim(),
            frequency: it.frequency.trim(),
            duration: it.duration.trim() || null,
            instructions: it.instructions.trim() || null,
          })),
        investigations: investigations
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        advice: advice.trim() || null,
        followUpAt: followUpAt ? new Date(`${followUpAt}T00:00:00`) : null,
      },
    };
  }

  async function onSaveDraft() {
    setSaving(true);
    setError(null);
    try {
      const res = await saveVisitDraftAction(visitId, buildInput());
      if (!res.ok) {
        setError("This visit is already signed.");
        return;
      }
      setSavedAt(Date.now());
    } catch {
      setError("Could not save the draft. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function onRegenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${visitId}/regenerate-note`, { method: "POST" });
      if (!res.ok) {
        setError("Could not regenerate from the transcript.");
        return;
      }
      router.refresh();
      // The server state changed; reload to pull the fresh draft into the form.
      window.location.reload();
    } catch {
      setError("Could not regenerate from the transcript.");
    } finally {
      setRegenerating(false);
    }
  }

  async function onSign() {
    setSigning(true);
    setError(null);
    try {
      const res = await signVisitAction(visitId, buildInput());
      if (!res.ok) {
        setError("This visit is already signed.");
        return;
      }
      // Generate the patient-facing summary from the freshly signed record.
      await fetch(`/api/visits/${visitId}/patient-summary`, { method: "POST" }).catch(() => null);
      router.push(`/dashboard/patients/${patientId}#clinical-notes`);
    } catch {
      setError("Could not sign the visit. Please try again.");
      setSigning(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
      <Link
        href={`/dashboard/patients/${patientId}`}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={14} /> Back to chart
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">Review visit — {patientName}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Edit the note and prescription, then sign. Once signed, this visit can&apos;t be edited.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onRegenerate} disabled={regenerating || signing}>
          {regenerating ? "Regenerating…" : "Regenerate from transcript"}
        </Button>
        <Button variant="outline" onClick={onSaveDraft} disabled={saving || signing}>
          {saving ? "Saving…" : "Save draft"}
        </Button>
        {savedAt && <span className="text-xs text-green-700">Draft saved.</span>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-4 min-[1001px]:grid-cols-2">
        <Card>
          <CardTitle className="mb-3">SOAP note</CardTitle>
          <div className="flex flex-col gap-4">
            <SoapInput label="Subjective" value={subjective} onChange={setSubjective} />
            <SoapInput label="Objective" value={objective} onChange={setObjective} />
            <SoapInput label="Assessment" value={assessment} onChange={setAssessment} />
            <SoapInput label="Plan" value={plan} onChange={setPlan} />
          </div>
        </Card>

        <Card>
          <CardTitle className="mb-3">Prescription</CardTitle>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              {items.map((item, index) => {
                const conflicts = item.medicationName.trim()
                  ? checkDrugAllergyConflicts(item.medicationName, allergies)
                  : [];
                return (
                  <div key={index} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Medication {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove medication"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Input
                        id={`med-name-${index}`}
                        label="Name"
                        value={item.medicationName}
                        onChange={(e) => updateItem(index, { medicationName: e.target.value })}
                      />
                      <Input
                        id={`med-dose-${index}`}
                        label="Dose"
                        value={item.dose}
                        onChange={(e) => updateItem(index, { dose: e.target.value })}
                        placeholder="e.g. 500mg"
                      />
                      <Input
                        id={`med-route-${index}`}
                        label="Route"
                        value={item.route}
                        onChange={(e) => updateItem(index, { route: e.target.value })}
                        placeholder="e.g. Oral"
                      />
                      <Input
                        id={`med-frequency-${index}`}
                        label="Frequency"
                        value={item.frequency}
                        onChange={(e) => updateItem(index, { frequency: e.target.value })}
                        placeholder="e.g. Twice daily"
                      />
                      <Input
                        id={`med-duration-${index}`}
                        label="Duration"
                        value={item.duration}
                        onChange={(e) => updateItem(index, { duration: e.target.value })}
                        placeholder="e.g. 7 days"
                      />
                      <Input
                        id={`med-instructions-${index}`}
                        label="Instructions"
                        value={item.instructions}
                        onChange={(e) => updateItem(index, { instructions: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                    {conflicts.map((c, ci) => (
                      <p key={ci} className="mt-2 flex items-start gap-1 text-xs text-red-600">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                        Allergy conflict — {c.allergen}: {c.description}
                      </p>
                    ))}
                  </div>
                );
              })}
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus size={13} /> Add medication
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Investigations ordered (one per line)</label>
              <textarea
                value={investigations}
                onChange={(e) => setInvestigations(e.target.value)}
                rows={3}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Advice</label>
              <textarea
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                rows={2}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <Input
              id="follow-up-date"
              type="date"
              label="Follow-up date"
              value={followUpAt}
              onChange={(e) => setFollowUpAt(e.target.value)}
            />
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Link href={`/dashboard/patients/${patientId}`}>
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={() => setConfirmOpen(true)} disabled={signing}>
          <ShieldCheck size={14} /> Sign &amp; finalize
        </Button>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Sign & finalize visit">
        <p className="text-sm text-slate-600">
          This locks the note and prescription, generates the prescription PDF, and adds the prescribed
          medications to the chart. It can&apos;t be edited afterward.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={signing}>
            Cancel
          </Button>
          <Button onClick={onSign} disabled={signing}>
            {signing ? "Signing…" : "Sign & finalize"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
