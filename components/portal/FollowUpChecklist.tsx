"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ClipboardList, Check, X, Loader2, FlaskConical, Scan, CalendarCheck, FileCheck2, Share2, FileUp } from "lucide-react";
import type { FollowUpItem } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { completeFollowUpAction, dismissFollowUpAction } from "@/lib/actions/followUps";

export interface PortalDocRequest {
  id: string;
  documentType: string;
  description: string;
  dueAt: string | null;
}

const GROUPS: { key: string; label: string; kinds: string[]; icon: typeof Check }[] = [
  { key: "results", label: "Results ready to view", kinds: ["RESULT_AVAILABLE"], icon: FileCheck2 },
  { key: "tests", label: "Tests to complete", kinds: ["TEST"], icon: FlaskConical },
  { key: "imaging", label: "Imaging to complete", kinds: ["IMAGING"], icon: Scan },
  { key: "visit", label: "Before your next visit", kinds: ["APPOINTMENT"], icon: CalendarCheck },
  { key: "referral", label: "Referrals", kinds: ["REFERRAL"], icon: Share2 },
  { key: "other", label: "Other", kinds: ["OTHER"], icon: ClipboardList },
];

export function FollowUpChecklist({
  items,
  documentRequests = [],
}: {
  items: FollowUpItem[];
  documentRequests?: PortalDocRequest[];
}) {
  const [busy, setBusy] = useState<string | null>(null);

  if (items.length === 0 && documentRequests.length === 0) return null;

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
        <ClipboardList size={14} /> Reminders
      </CardTitle>
      <div className="flex max-h-[32rem] flex-col gap-4 overflow-y-auto pr-1">
        {documentRequests.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <FileUp size={11} /> Documents to upload
            </p>
            <div className="flex flex-col gap-2">
              {documentRequests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{r.documentType}</p>
                    <p className="text-xs text-slate-500">{r.description}</p>
                    {r.dueAt && (
                      <p className="text-xs text-slate-400">by {format(new Date(r.dueAt), "MMM d, yyyy")}</p>
                    )}
                  </div>
                  <Link
                    href={`/portal/documents?type=${encodeURIComponent(r.documentType)}`}
                    className="shrink-0 rounded-md bg-[#2f66ea] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#2554c7]"
                  >
                    Upload
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
        {GROUPS.map((group) => {
          const groupItems = items.filter((i) => group.kinds.includes(i.kind));
          if (groupItems.length === 0) return null;
          const Icon = group.icon;
          return (
            <div key={group.key}>
              <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Icon size={11} /> {group.label}
              </p>
              <div className="flex flex-col gap-2">
                {groupItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{item.description}</p>
                      {item.dueAt && (
                        <p className="text-xs text-slate-500">by {format(item.dueAt, "MMM d, yyyy")}</p>
                      )}
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
            </div>
          );
        })}
      </div>
    </Card>
  );
}
