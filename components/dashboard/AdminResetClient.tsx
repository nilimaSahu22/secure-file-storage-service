"use client";

import { useState } from "react";
import { RotateCcw, ShieldCheck } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { resetDemoDataAction } from "@/lib/actions/admin";

export function AdminResetClient() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  async function onConfirm() {
    setResetting(true);
    setResult(null);
    try {
      await resetDemoDataAction();
      setResult("success");
      setConfirmOpen(false);
    } catch (err) {
      console.error(err);
      setResult("error");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 flex items-center gap-2 text-xl font-semibold text-slate-900">
        <ShieldCheck size={18} /> Admin
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Environment controls for demo operators.
      </p>

      <Card className="max-w-xl">
        <CardTitle className="mb-2">Reset Demo Data</CardTitle>
        <p className="mb-4 text-sm text-slate-600">
          Wipes every patient, note, task, appointment, and prior authorization in this
          environment and re-seeds the original demo fixtures. Run this before every client
          meeting so nobody sees state left over from a prior session.
        </p>
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This cannot be undone. All data created during this session — including AI-generated
          notes and manually added records — will be permanently replaced with the seed
          fixtures.
        </p>
        <Button onClick={() => setConfirmOpen(true)}>
          <RotateCcw size={14} /> Reset Demo Data
        </Button>
        {result === "success" && (
          <p className="mt-3 text-sm text-green-700">
            Demo data reset successfully. Reload the patient list to see the fresh fixtures.
          </p>
        )}
        {result === "error" && (
          <p className="mt-3 text-sm text-red-600">
            Reset failed. Check server logs — this usually means the database is unreachable.
          </p>
        )}
      </Card>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Reset all demo data?">
        <p className="mb-6 text-sm text-slate-600">
          This will permanently delete all current patients, notes, tasks, and other records,
          replacing them with the original seed fixtures. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={resetting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={resetting}>
            {resetting ? "Resetting…" : "Reset everything"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
