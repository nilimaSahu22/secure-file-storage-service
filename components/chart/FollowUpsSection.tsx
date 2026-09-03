"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import type { FollowUpItem } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/chart/UnifiedChartView";

const COLLAPSED_COUNT = 6;

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
  const [expanded, setExpanded] = useState(false);
  const visible = items.filter((i) => i.status !== "DISMISSED");
  const shown = expanded ? visible : visible.slice(0, COLLAPSED_COUNT);
  const hiddenCount = visible.length - shown.length;

  return (
    <Card>
      <CardTitle className="mb-3 flex items-center gap-1.5">
        <ClipboardList size={14} /> Follow-up checklist
      </CardTitle>
      {visible.length === 0 ? (
        <EmptyState label="No follow-up items." />
      ) : (
        <>
          <div className={`flex flex-col gap-2 ${expanded ? "max-h-96 overflow-y-auto pr-1" : ""}`}>
            {shown.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900" title={item.description}>
                    {item.description}
                  </p>
                  <p className="text-xs text-slate-500">
                    {KIND_LABEL[item.kind] ?? item.kind}
                    {item.dueAt ? ` · due ${format(item.dueAt, "MMM d, yyyy")}` : ""}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[item.status]}>{item.status.toLowerCase()}</Badge>
              </div>
            ))}
          </div>

          {visible.length > COLLAPSED_COUNT && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              {expanded ? (
                <>
                  <ChevronUp size={13} /> Show fewer
                </>
              ) : (
                <>
                  <ChevronDown size={13} /> Show {hiddenCount} more
                </>
              )}
            </button>
          )}
        </>
      )}
    </Card>
  );
}
