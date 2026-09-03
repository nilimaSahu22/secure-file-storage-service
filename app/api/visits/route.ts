import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { auth } from "@/lib/auth";
import { getAnthropicClient, getModel } from "@/lib/ai/client";
import { buildChartContext } from "@/lib/ai/chartContext";
import { getPatientById } from "@/lib/services/patients";
import { createVisitWithNote } from "@/lib/services/visits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const SCRIBE_SYSTEM_PROMPT =
  "You are a clinical scribe. Given a patient's chart context and a visit transcript, produce a " +
  "structured SOAP note AND draft the prescription the clinician gave. Base everything only on the " +
  "transcript and chart context — do not invent findings or a prescription. For the prescription: " +
  "extract every medication prescribed (name, dose, route, frequency, and duration/instructions if " +
  "stated), every investigation or test ordered, any advice given, and the follow-up interval in days " +
  "if one was stated. Use empty arrays and null when nothing was said. Write the note in the language " +
  "the transcript is predominantly in.";

export const visitDraftSchema = z.object({
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
  prescription: z.object({
    items: z
      .array(
        z.object({
          medicationName: z.string(),
          dose: z.string(),
          route: z.string(),
          frequency: z.string(),
          duration: z.string().nullable(),
          instructions: z.string().nullable(),
        })
      )
      .max(12),
    investigations: z.array(z.string()).max(12),
    advice: z.string(),
    followUpDays: z.number().int().nullable(),
  }),
});

export type VisitDraft = z.infer<typeof visitDraftSchema>;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.type !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { patientId, authorId, transcript } = body ?? {};
  if (typeof patientId !== "string" || !patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }
  if (typeof authorId !== "string" || !authorId) {
    return NextResponse.json({ error: "authorId is required" }, { status: 400 });
  }
  if (typeof transcript !== "string" || !transcript.trim()) {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 });
  }

  const patient = await getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: "NotFound" }, { status: 404 });

  const chartContext = buildChartContext(patient);

  let parsed: VisitDraft;
  try {
    const client = getAnthropicClient();
    const response = await client.messages.parse({
      model: getModel(),
      max_tokens: 1500,
      system: SCRIBE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Chart context:\n${chartContext}\n\nVisit transcript:\n${transcript}` }],
      output_config: { format: zodOutputFormat(visitDraftSchema) },
    });
    if (!response.parsed_output) return NextResponse.json({ error: "EmptyNote" }, { status: 502 });
    parsed = response.parsed_output;
  } catch (err) {
    console.error("Visit generation failed:", err);
    return NextResponse.json({ error: "AIRequestFailed" }, { status: 502 });
  }

  const followUpAt =
    parsed.prescription.followUpDays != null
      ? new Date(Date.now() + parsed.prescription.followUpDays * 86_400_000)
      : null;

  const visit = await createVisitWithNote({
    patientId,
    authorId,
    transcript,
    soap: {
      subjective: parsed.subjective,
      objective: parsed.objective,
      assessment: parsed.assessment,
      plan: parsed.plan,
    },
    isAiGenerated: true,
    prescription: {
      items: parsed.prescription.items,
      investigations: parsed.prescription.investigations,
      advice: parsed.prescription.advice || null,
      followUpAt,
    },
  });

  return NextResponse.json({ visitId: visit.id });
}
