import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getAnthropicClient, getModel } from "@/lib/ai/client";
import { getVisitForSummary, savePatientSummary } from "@/lib/services/patientSummary";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const summarySchema = z.object({
  plainSummary: z.string(),
  plainPrescription: z.string(),
});

const SYSTEM_PROMPT =
  "Rewrite this finalized visit note and prescription in plain language for the patient, at about a " +
  "6th-grade reading level. Use ONLY information written in the note and prescription below — do not " +
  "add advice, warnings, diagnoses, dosing, or follow-up instructions that are not explicitly present. " +
  "Plain prose only, no markdown, no headings. plainSummary: what was discussed and found (subjective, " +
  "objective, assessment, plan) in plain words. plainPrescription: each medicine (what it is, how much, " +
  "how often, how long), the tests that were ordered, the advice given, and the follow-up date if one " +
  "was stated.";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const visit = await getVisitForSummary(id);
  if (!visit) return NextResponse.json({ error: "NotFound" }, { status: 404 });

  if (session.user.type === "patient" && session.user.id !== visit.patientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (visit.status !== "SIGNED" || !visit.note) {
    return NextResponse.json({ error: "NotSigned" }, { status: 409 });
  }

  const note = visit.note;
  const rx = visit.prescription;
  const source =
    `Subjective: ${note.subjective}\nObjective: ${note.objective}\n` +
    `Assessment: ${note.assessment}\nPlan: ${note.plan}\n\n` +
    `Prescription:\n` +
    (rx && rx.items.length
      ? rx.items
          .map(
            (i) =>
              `- ${i.medicationName} ${i.dose} ${i.route} ${i.frequency}` +
              `${i.duration ? ` for ${i.duration}` : ""}${i.instructions ? ` (${i.instructions})` : ""}`
          )
          .join("\n")
      : "- No medications prescribed.") +
    `\nInvestigations ordered: ${rx?.investigations.length ? rx.investigations.join(", ") : "none"}` +
    `\nAdvice: ${rx?.advice ?? "none"}` +
    `\nFollow-up date: ${rx?.followUpAt ? rx.followUpAt.toISOString().slice(0, 10) : "none stated"}`;

  try {
    const client = getAnthropicClient();
    const response = await client.messages.parse({
      model: getModel(),
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: source }],
      output_config: { format: zodOutputFormat(summarySchema) },
    });
    if (!response.parsed_output) return NextResponse.json({ error: "EmptySummary" }, { status: 502 });

    await savePatientSummary(id, {
      plainSummary: response.parsed_output.plainSummary,
      plainPrescription: response.parsed_output.plainPrescription,
      sourceNoteVersion: note.noteVersion,
    });
  } catch (err) {
    console.error("Patient summary generation failed:", err);
    return NextResponse.json({ error: "AIRequestFailed" }, { status: 502 });
  }

  await logAudit({
    actorType: session.user.type === "patient" ? "patient" : "staff",
    actorId: session.user.id,
    actorName: session.user.name ?? "Unknown",
    action: "visit.patient_summary_generated",
    targetType: "Visit",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
