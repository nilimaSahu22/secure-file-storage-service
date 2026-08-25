"use client";

import { FormEvent, useState } from "react";
import { format } from "date-fns";
import { Pill, Plus } from "lucide-react";
import type { Medication, Allergy } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/chart/UnifiedChartView";
import { addMedicationAction } from "@/lib/actions/medications";

interface MedicationsSectionProps {
  patientId: string;
  medications: Medication[];
  allergies: Allergy[];
}

export function MedicationsSection({ patientId, medications, allergies }: MedicationsSectionProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setWarning(null);
    try {
      const result = await addMedicationAction(patientId, { name, dosage, frequency });
      if (result.conflictCount > 0) {
        setWarning(
          `Added, but flagged ${result.conflictCount} potential allergy conflict${result.conflictCount > 1 ? "s" : ""} — see Clinical Alerts above.`
        );
      } else {
        setOpen(false);
        setName("");
        setDosage("");
        setFrequency("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-1.5">
          <Pill size={14} /> Medications
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus size={14} /> Add
        </Button>
      </div>

      {medications.length === 0 ? (
        <EmptyState label="No medications on file." />
      ) : (
        <div className="flex flex-col gap-2">
          {medications.map((m) => (
            <div key={m.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <p className="font-medium text-slate-900">
                {m.name} <span className="font-normal text-slate-500">— {m.dosage}</span>
              </p>
              <p className="text-xs text-slate-500">
                {m.frequency} · since {format(m.prescribedAt, "MMM d, yyyy")}
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Medication">
        {allergies.length > 0 && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Documented allergies: {allergies.map((a) => a.allergen).join(", ")}. A conflict
            check runs automatically when you save.
          </p>
        )}
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input id="med-name" label="Medication name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input id="med-dosage" label="Dosage" required value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 500mg" />
          <Input
            id="med-frequency"
            label="Frequency"
            required
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            placeholder="e.g. Twice daily"
          />
          {warning && <p className="text-xs text-red-600">{warning}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
