"use client";

import { FormEvent, useState } from "react";
import { format } from "date-fns";
import { FileClock, Plus, Loader2, CheckCircle2 } from "lucide-react";
import type { PriorAuthorization } from "@prisma/client";
import { PriorAuthStatus } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/chart/UnifiedChartView";
import { submitPriorAuthAction, updatePriorAuthStatusAction } from "@/lib/actions/priorAuth";

interface PriorAuthSectionProps {
  patientId: string;
  priorAuths: PriorAuthorization[];
}

const STATUS_TONE = {
  SUBMITTED: "neutral",
  UNDER_REVIEW: "amber",
  APPROVED: "green",
  DENIED: "red",
} as const;

const STEPS: PriorAuthStatus[] = [
  PriorAuthStatus.SUBMITTED,
  PriorAuthStatus.UNDER_REVIEW,
  PriorAuthStatus.APPROVED,
];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function PriorAuthSection({ patientId, priorAuths }: PriorAuthSectionProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [animatedStatus, setAnimatedStatus] = useState<PriorAuthStatus | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const record = await submitPriorAuthAction(patientId, description);
      setOpen(false);
      setDescription("");
      await runAnimation(record.id, patientId);
    } finally {
      setSubmitting(false);
    }
  }

  async function runAnimation(id: string, patientId: string) {
    setAnimatingId(id);
    for (const step of STEPS) {
      setAnimatedStatus(step);
      await updatePriorAuthStatusAction(id, patientId, step);
      await wait(900);
    }
    setAnimatingId(null);
    setAnimatedStatus(null);
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-1.5">
          <FileClock size={14} /> Prior Authorizations
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus size={14} /> Submit Prior Auth
        </Button>
      </div>

      {priorAuths.length === 0 ? (
        <EmptyState label="No prior authorizations on file." />
      ) : (
        <div className="flex flex-col gap-2">
          {priorAuths.map((pa) => {
            const isAnimating = animatingId === pa.id;
            const displayStatus = isAnimating && animatedStatus ? animatedStatus : pa.status;
            return (
              <div key={pa.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{pa.serviceDescription}</p>
                  <p className="text-xs text-slate-400">{format(pa.submittedAt, "MMM d, yyyy")}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isAnimating && <Loader2 size={13} className="animate-spin text-blue-500" />}
                  {!isAnimating && displayStatus === "APPROVED" && (
                    <CheckCircle2 size={13} className="text-green-500" />
                  )}
                  <Badge tone={STATUS_TONE[displayStatus]}>{displayStatus.replace("_", " ")}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Submit Prior Authorization">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input
            id="pa-description"
            label="Service description"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. MRI brain without contrast"
          />
          <p className="text-xs text-slate-400">
            After submission, status will progress through Submitted → Under Review →
            Approved to simulate a payer response.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
