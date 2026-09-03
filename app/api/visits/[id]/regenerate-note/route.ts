import { NextRequest, NextResponse } from "next/server";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { auth } from "@/lib/auth";
import { getAnthropicClient, getModel } from "@/lib/ai/client";
import { buildChartContext } from "@/lib/ai/chartContext";
import { getPatientById } from "@/lib/services/patients";
import { getVisitById, updateDraftVisit, VisitLockedError } from "@/lib/services/visits";
import { SCRIBE_SYSTEM_PROMPT, visitDraftSchema, type VisitDraft } from "@/app/api/visits/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.type !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const visit = await getVisitById(id);
  if (!visit) return NextResponse.json({ error: "NotFound" }, { status: 404 });
  if (visit.status !== "DRAFT") return NextResponse.json({ error: "Locked" }, { status: 409 });
  if (!visit.transcript?.trim()) return NextResponse.json({ error: "NoTranscript" }, { status: 400 });

  const patient = await getPatientById(visit.patientId);
  if (!patient) return NextResponse.json({ error: "NotFound" }, { status: 404 });

  let parsed: VisitDraft;
  try {
    const client = getAnthropicClient();
    const response = await client.messages.parse({
      model: getModel(),
      max_tokens: 1500,
      system: SCRIBE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Chart context:\n${buildChartContext(patient)}\n\nVisit transcript:\n${visit.transcript}`,
        },
      ],
      output_config: { format: zodOutputFormat(visitDraftSchema) },
    });
    if (!response.parsed_output) return NextResponse.json({ error: "EmptyNote" }, { status: 502 });
    parsed = response.parsed_output;
  } catch (err) {
    console.error("Visit note regeneration failed:", err);
    return NextResponse.json({ error: "AIRequestFailed" }, { status: 502 });
  }

  const followUpAt =
    parsed.prescription.followUpDays != null
      ? new Date(Date.now() + parsed.prescription.followUpDays * 86_400_000)
      : null;

  try {
    await updateDraftVisit(id, {
      soap: {
        subjective: parsed.subjective,
        objective: parsed.objective,
        assessment: parsed.assessment,
        plan: parsed.plan,
      },
      prescription: {
        items: parsed.prescription.items,
        investigations: parsed.prescription.investigations,
        advice: parsed.prescription.advice || null,
        followUpAt,
      },
    });
  } catch (err) {
    if (err instanceof VisitLockedError) return NextResponse.json({ error: "Locked" }, { status: 409 });
    throw err;
  }

  return NextResponse.json({ ok: true });
}
