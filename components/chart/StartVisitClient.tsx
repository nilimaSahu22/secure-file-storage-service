"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Mic, Square, FileText } from "lucide-react";
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

type RecordingState = "idle" | "recording" | "transcribing";
type SpeakerRole = "Doctor" | "Patient";

function applySpeakerRoles(rawTranscript: string, roles: Record<number, SpeakerRole>): string {
  let labeled = rawTranscript;
  for (const [speakerId, role] of Object.entries(roles)) {
    labeled = labeled.replace(new RegExp(`^Speaker ${speakerId}:`, "gm"), `${role}:`);
  }
  return labeled;
}

export function StartVisitClient({ patient, staff }: StartVisitClientProps) {
  const router = useRouter();
  const [authorId, setAuthorId] = useState(staff.find((s) => s.role === "DOCTOR")?.id ?? staff[0]?.id ?? "");
  const [transcript, setTranscript] = useState(MOCK_TRANSCRIPT);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordError, setRecordError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Raw, un-relabeled transcript ("Speaker 0:", "Speaker 1:") kept alongside the
  // editable transcript so toggling the who's-who picker can always re-derive
  // labels from a clean source instead of chaining regex replaces on itself.
  const [rawTranscript, setRawTranscript] = useState<string | null>(null);
  const [speakers, setSpeakers] = useState<number[]>([]);
  const [speakerRoles, setSpeakerRoles] = useState<Record<number, SpeakerRole>>({});
  const [hasTranscribed, setHasTranscribed] = useState(false);
  // True when a single voice was recorded and the dialogue was split into
  // Doctor/Patient turns by content rather than by speaker separation.
  const [segmented, setSegmented] = useState(false);

  function setSpeakerRole(speakerId: number, role: SpeakerRole) {
    const nextRoles = { ...speakerRoles, [speakerId]: role };
    setSpeakerRoles(nextRoles);
    if (rawTranscript) setTranscript(applySpeakerRoles(rawTranscript, nextRoles));
  }

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

  async function startRecording() {
    setRecordError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordError("Audio recording isn't supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void transcribeRecording();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingState("recording");
    } catch {
      setRecordError("Microphone access was denied or unavailable.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  async function transcribeRecording() {
    setRecordingState("transcribing");
    try {
      const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });

      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": mimeType },
        body: blob,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setRecordError(
          res.status === 503
            ? "Ambient transcription isn't configured yet."
            : (data?.error ?? "Could not transcribe the recording.")
        );
        return;
      }

      const data = await res.json();
      const detected: number[] = data.speakers ?? [];
      setHasTranscribed(true);
      setSegmented(!!data.segmented);

      if (detected.length >= 2) {
        // The server infers who's the clinician vs the patient from the transcript
        // (who asks the questions, who describes symptoms). Fall back to "first
        // speaker is the doctor" if it didn't return a mapping. Editable below.
        const inferred: Partial<Record<number, SpeakerRole>> = data.speakerRoles ?? {};
        const defaults: Record<number, SpeakerRole> = {};
        detected.forEach((id, i) => {
          defaults[id] = inferred[id] ?? (i === 0 ? "Doctor" : "Patient");
        });
        setRawTranscript(data.transcript);
        setSpeakers(detected);
        setSpeakerRoles(defaults);
        setTranscript(applySpeakerRoles(data.transcript, defaults));
      } else {
        // Diarization didn't separate two voices — nothing to relabel, just
        // show the flat transcript as-is for manual editing.
        setRawTranscript(null);
        setSpeakers([]);
        setSpeakerRoles({});
        setTranscript(data.transcript);
      }
    } catch {
      setRecordError("Could not transcribe the recording. Please try again.");
    } finally {
      setRecordingState("idle");
    }
  }

  function loadSampleTranscript() {
    setTranscript(MOCK_TRANSCRIPT);
    setRawTranscript(null);
    setSpeakers([]);
    setSpeakerRoles({});
    setHasTranscribed(false);
    setSegmented(false);
    setRecordError(null);
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
          Record the visit to transcribe it automatically, or edit the transcript below,
          then generate a structured SOAP note. AI-generated notes are labeled and should
          be reviewed before they become part of the chart.
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

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {recordingState === "idle" && (
            <Button variant="outline" onClick={startRecording}>
              <Mic size={14} /> Record Visit
            </Button>
          )}
          {recordingState === "recording" && (
            <Button variant="danger" onClick={stopRecording}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-white opacity-75" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-white" />
              </span>
              Stop Recording
            </Button>
          )}
          {recordingState === "transcribing" && (
            <Button variant="outline" disabled>
              <Square size={14} className="animate-pulse" /> Transcribing…
            </Button>
          )}
          <Button variant="ghost" onClick={loadSampleTranscript} disabled={recordingState !== "idle"}>
            <FileText size={14} /> Load Sample Transcript
          </Button>
        </div>
        {recordError && <p className="mb-3 text-sm text-red-600">{recordError}</p>}

        {speakers.length >= 2 && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="font-medium text-slate-700">Who&apos;s who?</span>
            {speakers.map((id) => (
              <label key={id} className="flex items-center gap-1.5">
                Speaker {id}
                <select
                  value={speakerRoles[id] ?? "Patient"}
                  onChange={(e) => setSpeakerRole(id, e.target.value as SpeakerRole)}
                  className="rounded border border-slate-300 px-1.5 py-0.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="Doctor">Doctor</option>
                  <option value="Patient">Patient</option>
                </select>
              </label>
            ))}
          </div>
        )}
        {recordingState === "idle" && hasTranscribed && rawTranscript === null && segmented && (
          <p className="mb-3 text-sm text-slate-500">
            Only one voice was picked up, so the conversation was split into Doctor and
            Patient turns by what was said. Review and correct the transcript below before
            generating the note.
          </p>
        )}
        {recordingState === "idle" && hasTranscribed && rawTranscript === null && !segmented && (
          <p className="mb-3 text-sm text-slate-500">
            Speaker separation wasn&apos;t detected in this recording — edit the transcript below if needed.
          </p>
        )}

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
          <Button
            onClick={onGenerate}
            disabled={generating || recordingState !== "idle" || !transcript.trim()}
          >
            <Sparkles size={14} />
            {generating ? "Generating note…" : "Generate Note"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
