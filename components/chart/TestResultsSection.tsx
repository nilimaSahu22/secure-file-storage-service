"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { MedicalFile, TestResult } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/chart/UnifiedChartView";

type ResultRow = TestResult & { sourceFile: MedicalFile | null };

const COLLAPSED_COUNT = 5;

export function TestResultsSection({ results }: { results: ResultRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? results : results.slice(0, COLLAPSED_COUNT);
  const hiddenCount = results.length - shown.length;

  return (
    <Card>
      <CardTitle className="mb-3">Test Results</CardTitle>
      {results.length === 0 ? (
        <EmptyState label="No test results on file." />
      ) : (
        <>
          <div
            className={`flex flex-col gap-2 ${expanded ? "max-h-96 overflow-y-auto pr-1" : ""}`}
          >
            {shown.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900" title={t.testName}>
                    {t.testName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t.normalRange ? `Normal: ${t.normalRange}` : "No reference range"}
                  </p>
                  {t.enteredByAI && (
                    <p className="mt-0.5 text-xs text-amber-700">From uploaded document — unverified</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium text-slate-900">{t.result}</p>
                  <p className="text-xs text-slate-400">{format(t.recordedAt, "MMM d, yyyy")}</p>
                </div>
              </div>
            ))}
          </div>

          {(hiddenCount > 0 || expanded) && results.length > COLLAPSED_COUNT && (
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
