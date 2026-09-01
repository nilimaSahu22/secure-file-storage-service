"use client";

import { useState } from "react";
import type { Department } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import type { WorkflowData } from "@/lib/services/workflows";

interface WorkflowViewerProps {
  workflows: WorkflowData[];
  initialDepartment?: Department | null;
}

const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-100 text-amber-800",
  critical: "bg-orange-100 text-orange-800",
  stat: "bg-red-100 text-red-700",
};

function priorityBadgeClass(priority: string): string {
  return PRIORITY_BADGE[priority.trim().toLowerCase()] ?? "bg-slate-100 text-slate-600";
}

function deptLabel(department: Department): string {
  return department.charAt(0) + department.slice(1).toLowerCase();
}

export function WorkflowViewer({ workflows, initialDepartment }: WorkflowViewerProps) {
  const defaultDept =
    (initialDepartment && workflows.some((w) => w.department === initialDepartment)
      ? initialDepartment
      : workflows[0]?.department) ?? "OPD";
  const [active, setActive] = useState<Department>(defaultDept);

  const current = workflows.find((w) => w.department === active);

  return (
    <Card>
      <div className="mb-4 flex border-b border-slate-100">
        {workflows.map((w) => (
          <button
            key={w.department}
            onClick={() => setActive(w.department)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              active === w.department
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {deptLabel(w.department)}
          </button>
        ))}
      </div>

      {!current ? (
        <p className="text-sm text-slate-400">No workflow configured for this department.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Intake steps</h3>
            {current.intakeSteps.length === 0 ? (
              <p className="text-sm text-slate-400">No intake steps configured.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {current.intakeSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Triage rules</h3>
            {current.triageRules.length === 0 ? (
              <p className="text-sm text-slate-400">No triage rules configured.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {current.triageRules.map((rule, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-xs text-slate-400">If</span>
                    <span className="flex-1">{rule.condition}</span>
                    <span className="shrink-0 text-xs text-slate-400">→</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${priorityBadgeClass(
                        rule.priority
                      )}`}
                    >
                      {rule.priority}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Escalation path</h3>
            {current.escalationPath ? (
              <p className="text-sm text-slate-700">{current.escalationPath}</p>
            ) : (
              <p className="text-sm text-slate-400">No escalation path configured.</p>
            )}
          </section>
        </div>
      )}
    </Card>
  );
}
