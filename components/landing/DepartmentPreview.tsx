"use client";

import { useState } from "react";
import type { Department } from "@prisma/client";
import type { WorkflowData } from "@/lib/services/workflows";

interface DepartmentPreviewProps {
  workflows: WorkflowData[];
}

export function DepartmentPreview({ workflows }: DepartmentPreviewProps) {
  const [active, setActive] = useState<Department>(workflows[0]?.department ?? "OPD");
  const dept = workflows.find((d) => d.department === active);

  if (!dept) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Configured per department, not one-size-fits-all</h2>
        <p className="mt-3 text-sm text-slate-600">
          Admins define intake steps and escalation paths for each department — Meridian
          adapts to how your teams already triage.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex border-b border-slate-100">
          {workflows.map((d) => (
            <button
              key={d.department}
              onClick={() => setActive(d.department)}
              className={`flex-1 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                active === d.department
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {d.department.charAt(0) + d.department.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Intake steps</p>
            <ol className="flex flex-col gap-2">
              {dept.intakeSteps.map((step, i) => (
                <li key={step} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Escalation path</p>
            <p className="text-sm text-slate-700">{dept.escalationPath}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
