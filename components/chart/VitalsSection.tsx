"use client";

import { FormEvent, useState } from "react";
import { format } from "date-fns";
import { Activity, Plus, AlertTriangle } from "lucide-react";
import type { VitalSign } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/chart/UnifiedChartView";
import { addVitalAction } from "@/lib/actions/vitals";
import { VITAL_RANGES } from "@/lib/clinical/rules";

interface VitalsSectionProps {
  patientId: string;
  vitals: VitalSign[];
}

const VITAL_TYPES = Object.keys(VITAL_RANGES);

export function VitalsSection({ patientId, vitals }: VitalsSectionProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(VITAL_TYPES[0]);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await addVitalAction(patientId, type, value);
      if (result.isAbnormal) {
        setFeedback(`Recorded. Value flagged outside the normal range for ${type}.`);
      } else {
        setOpen(false);
        setValue("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-1.5">
          <Activity size={14} /> Vitals
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus size={14} /> Add
        </Button>
      </div>

      {vitals.length === 0 ? (
        <EmptyState label="No vitals recorded." />
      ) : (
        <div className="flex flex-col gap-2">
          {vitals.map((v) => (
            <div
              key={v.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                v.isAbnormal ? "bg-red-50" : "bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {v.isAbnormal && <AlertTriangle size={13} className="text-red-500" />}
                <span className="font-medium text-slate-900">{v.type}</span>
              </div>
              <div className="text-right">
                <p className={`font-medium ${v.isAbnormal ? "text-red-600" : "text-slate-900"}`}>
                  {v.value} {VITAL_RANGES[v.type]?.unit ?? ""}
                </p>
                <p className="text-xs text-slate-400">{format(v.recordedAt, "MMM d, yyyy")}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Vital">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Select id="vital-type" label="Type" value={type} onChange={(e) => setType(e.target.value)}>
            {VITAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t} ({VITAL_RANGES[t].unit})
              </option>
            ))}
          </Select>
          <Input id="vital-value" label="Value" required value={value} onChange={(e) => setValue(e.target.value)} />
          {feedback && <p className="text-xs text-red-600">{feedback}</p>}
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
