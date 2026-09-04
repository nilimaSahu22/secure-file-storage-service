"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { FlaskConical, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { markResultsSeenAction } from "@/lib/actions/followUps";

export function ResultsReadyCard({ count, sinceDate }: { count: number; sinceDate: string | null }) {
  const [busy, setBusy] = useState(false);

  const noun = count === 1 ? "result is" : "results are";
  const source = sinceDate ? `From your ${format(new Date(sinceDate), "MMMM d")} blood work` : "From your recent blood work";

  return (
    <Card className="flex items-start gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#2f66ea]">
        <FlaskConical size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-slate-900">
          {count} new test {noun} ready
        </p>
        <p className="mt-1 text-sm text-slate-600">{source} — reviewed by your care team.</p>
        <div className="mt-3 flex items-center gap-4">
          <Link
            href="/portal/visits"
            className="rounded-lg bg-[#2f66ea] px-4 py-2 text-sm font-medium text-white hover:bg-[#2554c7]"
          >
            View results
          </Link>
          <button
            onClick={() => {
              setBusy(true);
              void markResultsSeenAction().catch(() => setBusy(false));
            }}
            disabled={busy}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
          >
            {busy && <Loader2 size={12} className="animate-spin" />}
            Mark as seen
          </button>
        </div>
      </div>
    </Card>
  );
}
