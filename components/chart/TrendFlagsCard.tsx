"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Activity, X, Loader2 } from "lucide-react";
import type { TrendFlag } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { dismissTrendFlagAction } from "@/lib/actions/trendFlags";

interface Point {
  date: string;
  value: number;
}

function Sparkline({ points }: { points: Point[] }) {
  if (points.length < 2) return null;
  const w = 120;
  const h = 32;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - ((p.value - min) / range) * h}`)
    .join(" ");
  const last = points[points.length - 1];
  return (
    <svg width={w} height={h} className="shrink-0 overflow-visible">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-500" />
      <circle
        cx={(points.length - 1) * step}
        cy={h - ((last.value - min) / range) * h}
        r="2.5"
        className="fill-blue-600"
      />
    </svg>
  );
}

const DIRECTION_ICON = { RISING: TrendingUp, FALLING: TrendingDown, FLUCTUATING: Activity } as const;

export function TrendFlagsCard({ flags }: { flags: TrendFlag[] }) {
  const [busy, setBusy] = useState<string | null>(null);

  if (flags.length === 0) return null;

  async function dismiss(id: string) {
    setBusy(id);
    try {
      await dismissTrendFlagAction(id);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardTitle className="mb-1 flex items-center gap-1.5 text-blue-900">
        <Activity size={14} /> Trends
      </CardTitle>
      <p className="mb-3 text-xs text-slate-500">Informational only — not a diagnosis or risk score.</p>
      <div className="flex flex-col gap-3">
        {flags.map((flag) => {
          const Icon = DIRECTION_ICON[flag.direction];
          const points = Array.isArray(flag.dataPoints) ? (flag.dataPoints as unknown as Point[]) : [];
          return (
            <div key={flag.id} className="rounded-lg border border-blue-100 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                    <Icon size={13} className="text-blue-600" />
                    {flag.metric}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{flag.deterministicSummary}</p>
                  {flag.narrative && <p className="mt-1.5 text-sm text-slate-700">{flag.narrative}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button
                    onClick={() => dismiss(flag.id)}
                    disabled={busy === flag.id}
                    aria-label="Dismiss trend"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    {busy === flag.id ? <Loader2 size={12} className="animate-spin" /> : <X size={14} />}
                  </button>
                  <Sparkline points={points} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
