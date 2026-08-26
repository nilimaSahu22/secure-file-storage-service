"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Department } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { saveWorkflowAction } from "@/lib/actions/workflows";
import type { TriageRule, WorkflowData } from "@/lib/services/workflows";

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical", "STAT"];

interface WorkflowEditorProps {
  initialWorkflows: WorkflowData[];
}

export function WorkflowEditor({ initialWorkflows }: WorkflowEditorProps) {
  const [workflows, setWorkflows] = useState<WorkflowData[]>(initialWorkflows);
  const [active, setActive] = useState<Department>(initialWorkflows[0]?.department ?? "OPD");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const current = workflows.find((w) => w.department === active)!;

  function updateCurrent(updater: (w: WorkflowData) => WorkflowData) {
    setWorkflows((prev) => prev.map((w) => (w.department === active ? updater(w) : w)));
    setSavedAt(null);
  }

  function addIntakeStep() {
    updateCurrent((w) => ({ ...w, intakeSteps: [...w.intakeSteps, ""] }));
  }
  function updateIntakeStep(i: number, value: string) {
    updateCurrent((w) => ({ ...w, intakeSteps: w.intakeSteps.map((s, idx) => (idx === i ? value : s)) }));
  }
  function removeIntakeStep(i: number) {
    updateCurrent((w) => ({ ...w, intakeSteps: w.intakeSteps.filter((_, idx) => idx !== i) }));
  }

  function addTriageRule() {
    updateCurrent((w) => ({ ...w, triageRules: [...w.triageRules, { condition: "", priority: "Medium" }] }));
  }
  function updateTriageRule(i: number, patch: Partial<TriageRule>) {
    updateCurrent((w) => ({
      ...w,
      triageRules: w.triageRules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    }));
  }
  function removeTriageRule(i: number) {
    updateCurrent((w) => ({ ...w, triageRules: w.triageRules.filter((_, idx) => idx !== i) }));
  }

  async function onSave() {
    setSaving(true);
    try {
      const cleanIntake = current.intakeSteps.map((s) => s.trim()).filter(Boolean);
      const cleanRules = current.triageRules
        .map((r) => ({ condition: r.condition.trim(), priority: r.priority }))
        .filter((r) => r.condition);

      await saveWorkflowAction(current.department, cleanIntake, cleanRules, current.escalationPath.trim());
      setWorkflows((prev) =>
        prev.map((w) =>
          w.department === active ? { ...w, intakeSteps: cleanIntake, triageRules: cleanRules } : w
        )
      );
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

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
            {w.department.charAt(0) + w.department.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Intake steps</h3>
            <Button size="sm" variant="outline" onClick={addIntakeStep}>
              <Plus size={13} /> Add step
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {current.intakeSteps.length === 0 && (
              <p className="text-sm text-slate-400">No intake steps configured.</p>
            )}
            {current.intakeSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  id={`intake-${active}-${i}`}
                  value={step}
                  onChange={(e) => updateIntakeStep(i, e.target.value)}
                  className="flex-1"
                />
                <button
                  onClick={() => removeIntakeStep(i)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove step"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Triage rules</h3>
            <Button size="sm" variant="outline" onClick={addTriageRule}>
              <Plus size={13} /> Add rule
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {current.triageRules.length === 0 && (
              <p className="text-sm text-slate-400">No triage rules configured.</p>
            )}
            {current.triageRules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="shrink-0 text-xs text-slate-400">If</span>
                <Input
                  id={`triage-cond-${active}-${i}`}
                  value={rule.condition}
                  onChange={(e) => updateTriageRule(i, { condition: e.target.value })}
                  placeholder="condition"
                  className="flex-1"
                />
                <span className="shrink-0 text-xs text-slate-400">→ priority</span>
                <Select
                  id={`triage-priority-${active}-${i}`}
                  value={rule.priority}
                  onChange={(e) => updateTriageRule(i, { priority: e.target.value })}
                  className="w-32"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
                <button
                  onClick={() => removeTriageRule(i)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove rule"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Escalation path</h3>
          <textarea
            value={current.escalationPath}
            onChange={(e) => updateCurrent((w) => ({ ...w, escalationPath: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </section>

        <div className="flex items-center gap-3">
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          {savedAt && <span className="text-xs text-green-700">Saved.</span>}
        </div>
      </div>
    </Card>
  );
}
