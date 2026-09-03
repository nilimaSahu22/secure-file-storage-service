"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Mic, Activity } from "lucide-react";
import type { StaffUser } from "@prisma/client";
import { Button } from "@/components/ui/Button";

interface ChartActionsProps {
  patientId: string;
  staff: StaffUser[];
}

export function ChartActions({ patientId }: ChartActionsProps) {
  const router = useRouter();
  const [summarizing, setSummarizing] = useState(false);
  const [checkingTrends, setCheckingTrends] = useState(false);

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

  async function onCheckTrends() {
    setCheckingTrends(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/trend-flags`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setCheckingTrends(false);
    }
  }

  return (
    <div className="flex w-full shrink-0 flex-col gap-2 min-[521px]:w-auto min-[521px]:flex-row">
      <Button
        variant="outline"
        onClick={onSummarize}
        disabled={summarizing}
        className="w-full min-[521px]:w-auto"
      >
        <Sparkles size={14} />
        {summarizing ? "Summarizing…" : "Summarize Chart"}
      </Button>
      <Button
        variant="outline"
        onClick={onCheckTrends}
        disabled={checkingTrends}
        className="w-full min-[521px]:w-auto"
      >
        <Activity size={14} />
        {checkingTrends ? "Checking…" : "Check Trends"}
      </Button>
      <Button
        variant="outline"
        onClick={() => router.push(`/dashboard/patients/${patientId}/visit`)}
        className="w-full min-[521px]:w-auto"
      >
        <Mic size={14} />
        Start Visit
      </Button>
    </div>
  );
}
