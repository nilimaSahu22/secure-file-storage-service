"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Check, Loader2 } from "lucide-react";
import { completeFollowUpAction, dismissFollowUpAction } from "@/lib/actions/followUps";

export interface PortalTodoItem {
  id: string;
  label: string;
  dueAt: string | null;
}

export interface PortalTodoDocRequest {
  id: string;
  documentType: string;
  dueAt: string | null;
}

function due(dueAt: string | null) {
  if (!dueAt) return null;
  return <p className="text-xs text-slate-400">Due {format(new Date(dueAt), "MMM d, yyyy")}</p>;
}

export function PortalTodoList({
  items,
  documentRequests,
}: {
  items: PortalTodoItem[];
  documentRequests: PortalTodoDocRequest[];
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string, fn: (id: string) => Promise<unknown>) {
    setBusy(id);
    try {
      await fn(id);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col divide-y divide-slate-100">
      {documentRequests.map((r) => (
        <div key={r.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-900">Upload your {r.documentType.toLowerCase()}</p>
            {due(r.dueAt)}
          </div>
          <Link
            href={`/portal/documents?type=${encodeURIComponent(r.documentType)}`}
            className="shrink-0 text-sm font-medium text-blue-700 hover:underline"
          >
            Upload
          </Link>
        </div>
      ))}

      {items.map((t) => (
        <div key={t.id} className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <button
            onClick={() => run(t.id, completeFollowUpAction)}
            disabled={busy === t.id}
            aria-label={`Mark "${t.label}" done`}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-transparent transition-colors hover:border-[#2f66ea] hover:text-[#2f66ea]"
          >
            {busy === t.id ? <Loader2 size={11} className="animate-spin text-slate-400" /> : <Check size={11} />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-900">{t.label}</p>
            {due(t.dueAt)}
          </div>
          <button
            onClick={() => run(t.id, dismissFollowUpAction)}
            disabled={busy === t.id}
            className="shrink-0 text-xs text-slate-400 opacity-0 transition-opacity hover:text-slate-600 focus:opacity-100 group-hover:opacity-100"
          >
            Not needed
          </button>
        </div>
      ))}
    </div>
  );
}
