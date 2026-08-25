import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient, getModel } from "@/lib/ai/client";
import { buildChartContext } from "@/lib/ai/chartContext";
import { getPatientById } from "@/lib/services/patients";
import { createNote } from "@/lib/services/notes";
import { generateFollowUpTasks } from "@/lib/services/autoTasks";
import { updateVisitTranscript } from "@/lib/services/visits";

export const dynamic = "force-dynamic";

const soapNoteSchema = z.object({
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { patientId, authorId, visitId, transcript } = body ?? {};

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
  if (!patient) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  if (typeof visitId === "string" && visitId) {
    await updateVisitTranscript(visitId, transcript);
  }

  const chartContext = buildChartContext(patient);

  let parsed: z.infer<typeof soapNoteSchema>;
  try {
    const client = getAnthropicClient();
    const response = await client.messages.parse({
      model: getModel(),
      max_tokens: 1024,
      system:
        "You are a clinical scribe. Given a patient's chart context and a visit transcript, produce a structured SOAP note. Base the note only on the transcript and chart context provided — do not invent findings. Keep each section concise and clinically appropriate.",
      messages: [
        {
          role: "user",
          content: `Chart context:\n${chartContext}\n\nVisit transcript:\n${transcript}`,
        },
      ],
      output_config: {
        format: zodOutputFormat(soapNoteSchema),
      },
    });

    if (!response.parsed_output) {
      return NextResponse.json({ error: "EmptyNote" }, { status: 502 });
    }
    parsed = response.parsed_output;
  } catch (err) {
    console.error("Note generation failed:", err);
    return NextResponse.json({ error: "AIRequestFailed" }, { status: 502 });
  }

  const note = await createNote({
    patientId,
    authorId,
    visitId: typeof visitId === "string" ? visitId : undefined,
    subjective: parsed.subjective,
    objective: parsed.objective,
    assessment: parsed.assessment,
    plan: parsed.plan,
    isAiGenerated: true,
  });

  await generateFollowUpTasks(note);

  return NextResponse.json({ note });
}
