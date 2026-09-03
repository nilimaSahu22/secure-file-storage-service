"use client";

import { format } from "date-fns";
import { ClipboardList } from "lucide-react";
import type { FollowUpItem } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/chart/UnifiedChartView";

const STATUS_TONE: Record<string, "green" | "amber" | "neutral"> = {
  OUTSTANDING: "amber",
  COMPLETED: "green",
  DISMISSED: "neutral",
};

const KIND_LABEL: Record<string, string> = {
  TEST: "Lab test",
  IMAGING: "Imaging",
  APPOINTMENT: "Appointment",
  REFERRAL: "Referral",
  RESULT_AVAILABLE: "Result ready",
  OTHER: "Other",
};

export function FollowUpsSection({ items }: { items: FollowUpItem[] }) {
  const visible = items.filter((i) => i.status !== "DISMISSED");

  return (
    <Card>
      <CardTitle className="mb-3 flex items-center gap-1.5">
        <ClipboardList size={14} /> Follow-up checklist
      </CardTitle>
      {visible.length === 0 ? (
        <EmptyState label="No follow-up items." />
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-slate-900">{item.description}</p>
                <p className="text-xs text-slate-500">
                  {KIND_LABEL[item.kind] ?? item.kind}
                  {item.dueAt ? ` · due ${format(item.dueAt, "MMM d, yyyy")}` : ""}
                </p>
              </div>
              <Badge tone={STATUS_TONE[item.status]}>{item.status.toLowerCase()}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
