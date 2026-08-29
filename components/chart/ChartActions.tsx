"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Mic } from "lucide-react";
import type { StaffUser } from "@prisma/client";
import { Button } from "@/components/ui/Button";

interface ChartActionsProps {
  patientId: string;
  staff: StaffUser[];
}

export function ChartActions({ patientId }: ChartActionsProps) {
  const router = useRouter();
  const [summarizing, setSummarizing] = useState(false);

  async function onSummarize() {
    setSummarizing(true);
    try {
      const res = await fetch("/api/chart-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setSummarizing(false);
    }
  }

  return (
    <div className="flex shrink-0 gap-2 max-[520px]:w-full max-[520px]:flex-col">
      <Button variant="outline" onClick={onSummarize} disabled={summarizing} className="max-[520px]:w-full">
        <Sparkles size={14} />
        {summarizing ? "Summarizing…" : "Summarize Chart"}
      </Button>
      <Button
        variant="outline"
        onClick={() => router.push(`/dashboard/patients/${patientId}/visit`)}
        className="max-[520px]:w-full"
      >
        <Mic size={14} />
        Start Visit
      </Button>
    </div>
  );
}
