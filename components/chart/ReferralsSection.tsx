"use client";

import { FormEvent, useState } from "react";
import { Plus, Share2 } from "lucide-react";
import type { Referral, StaffUser } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/chart/UnifiedChartView";
import { createReferralAction } from "@/lib/actions/referrals";

type ReferralRow = Referral & { fromProvider: StaffUser; toProvider: StaffUser };

interface ReferralsSectionProps {
  patientId: string;
  referrals: ReferralRow[];
  staff: StaffUser[];
}

const STATUS_TONE = { PENDING: "neutral", ACCEPTED: "blue", COMPLETED: "green" } as const;

export function ReferralsSection({ patientId, referrals, staff }: ReferralsSectionProps) {
  const [open, setOpen] = useState(false);
  const [fromProviderId, setFromProviderId] = useState(staff[0]?.id ?? "");
  const [toProviderId, setToProviderId] = useState(staff[1]?.id ?? staff[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createReferralAction({ patientId, fromProviderId, toProviderId, reason });
      setOpen(false);
      setReason("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-1.5">
          <Share2 size={14} /> Referrals
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus size={14} /> New Referral
        </Button>
      </div>

      {referrals.length === 0 ? (
        <EmptyState label="No referrals on file." />
      ) : (
        <div className="flex flex-col gap-2">
          {referrals.map((r) => (
            <div key={r.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">
                  {r.fromProvider.name} → {r.toProvider.name}
                </p>
                <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">{r.reason}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Referral">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Select
            id="referral-from"
            label="From provider"
            value={fromProviderId}
            onChange={(e) => setFromProviderId(e.target.value)}
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select
            id="referral-to"
            label="To provider"
            value={toProviderId}
            onChange={(e) => setToProviderId(e.target.value)}
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Input
            id="referral-reason"
            label="Reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Cardiology evaluation for uncontrolled hypertension"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || fromProviderId === toProviderId}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </div>
          {fromProviderId === toProviderId && (
            <p className="text-xs text-red-600">From and to providers must differ.</p>
          )}
        </form>
      </Modal>
    </Card>
  );
}
