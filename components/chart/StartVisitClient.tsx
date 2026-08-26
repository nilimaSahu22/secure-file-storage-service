"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Mic } from "lucide-react";
import type { Patient, StaffUser } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

interface StartVisitClientProps {
  patient: Patient;
  staff: StaffUser[];
}

const MOCK_TRANSCRIPT = `Doctor: Good morning, what brings you in today?
Patient: I've been feeling more tired than usual and I noticed my ankles are a bit swollen in the evenings.
Doctor: How long has this been going on?
Patient: About two weeks now. I'm still taking my medications as prescribed.
Doctor: Any chest pain, shortness of breath, or dizziness?
Patient: No chest pain. I do get a little winded going up the stairs, more than before.
Doctor: Let's check your vitals and go over your recent labs. Blood pressure looks slightly elevated today. We'll adjust your plan and recheck in a few weeks.
Patient: Sounds good, thank you.`;

export function StartVisitClient({ patient, staff }: StartVisitClientProps) {
  const router = useRouter();
  const [authorId, setAuthorId] = useState(staff.find((s) => s.role === "DOCTOR")?.id ?? staff[0]?.id ?? "");
  const [transcript, setTranscript] = useState(MOCK_TRANSCRIPT);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id, authorId, transcript }),
      });
      if (!res.ok) {
        setError("Could not generate note. Please try again.");
        return;
      }
      router.push(`/dashboard/patients/${patient.id}`);
    } catch {
      setError("Could not generate note. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <Link
        href={`/dashboard/patients/${patient.id}`}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={14} /> Back to chart
      </Link>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Mic size={16} /> Start Visit — {patient.firstName} {patient.lastName}
          </CardTitle>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          Edit the visit transcript below, then generate a structured SOAP note.
          AI-generated notes are labeled and should be reviewed before they become part of
          the chart.
        </p>

        <div className="mb-4">
          <Select
            id="visit-author"
            label="Author"
            value={authorId}
            onChange={(e) => setAuthorId(e.target.value)}
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Visit transcript
        </label>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={12}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Link href={`/dashboard/patients/${patient.id}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={onGenerate} disabled={generating || !transcript.trim()}>
            <Sparkles size={14} />
            {generating ? "Generating note…" : "Generate Note"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
