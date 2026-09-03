"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ClipboardList, Check, X, Loader2 } from "lucide-react";
import type { FollowUpItem } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { completeFollowUpAction, dismissFollowUpAction } from "@/lib/actions/followUps";

const KIND_LABEL: Record<string, string> = {
  TEST: "Lab test",
  IMAGING: "Imaging",
  APPOINTMENT: "Appointment",
  REFERRAL: "Referral",
  RESULT_AVAILABLE: "Result ready",
  OTHER: "To do",
};

export function FollowUpChecklist({ items }: { items: FollowUpItem[] }) {
  const [busy, setBusy] = useState<string | null>(null);

  if (items.length === 0) return null;

  async function act(id: string, fn: (id: string) => Promise<unknown>) {
    setBusy(id);
    try {
      await fn(id);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardTitle className="mb-3 flex items-center gap-1.5">
        <ClipboardList size={14} /> Still to do
      </CardTitle>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{item.description}</p>
              <p className="text-xs text-slate-500">
                {KIND_LABEL[item.kind] ?? item.kind}
                {item.dueAt ? ` · by ${format(item.dueAt, "MMM d, yyyy")}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => act(item.id, completeFollowUpAction)}
                disabled={busy === item.id}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
              >
                {busy === item.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Done
              </button>
              <button
                onClick={() => act(item.id, dismissFollowUpAction)}
                disabled={busy === item.id}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
              >
                <X size={12} /> Not needed
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
