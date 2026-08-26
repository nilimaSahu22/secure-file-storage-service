import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getAnthropicClient, getModel } from "@/lib/ai/client";
import { getNoteById, addCodingSuggestions } from "@/lib/services/notes";

export const dynamic = "force-dynamic";

const suggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        code: z.string(),
        codeSystem: z.enum(["ICD-10", "CPT"]),
        description: z.string(),
        rationale: z.string(),
      })
    )
    .max(3),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const noteId = body?.noteId;

  if (typeof noteId !== "string" || !noteId) {
    return NextResponse.json({ error: "noteId is required" }, { status: 400 });
  }

  const note = await getNoteById(noteId);
  if (!note) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  const noteText = `Subjective: ${note.subjective}\nObjective: ${note.objective}\nAssessment: ${note.assessment}\nPlan: ${note.plan}`;

  let parsed: z.infer<typeof suggestionsSchema>;
  try {
    const client = getAnthropicClient();
    const response = await client.messages.parse({
      model: getModel(),
      max_tokens: 1024,
      system:
        "You are a medical coding assistant. Given a clinical SOAP note, suggest 2-3 relevant ICD-10 diagnosis codes and/or CPT procedure codes with a brief rationale for each. These are suggestions only, not validated codes — a human coder must review them before billing.",
      messages: [{ role: "user", content: noteText }],
      output_config: {
        format: zodOutputFormat(suggestionsSchema),
      },
    });

    if (!response.parsed_output) {
      return NextResponse.json({ error: "EmptySuggestions" }, { status: 502 });
    }
    parsed = response.parsed_output;
  } catch (err) {
    console.error("Coding suggestion generation failed:", err);
    return NextResponse.json({ error: "AIRequestFailed" }, { status: 502 });
  }

  await addCodingSuggestions(noteId, parsed.suggestions);

  const session = await auth();
  await logAudit({
    actorType: "staff",
    actorId: session?.user.id,
    actorName: session?.user.name ?? "Unknown staff",
    action: "codes.suggested",
    targetType: "ClinicalNote",
    targetId: noteId,
    metadata: { count: parsed.suggestions.length },
  });

  return NextResponse.json({ suggestions: parsed.suggestions });
}
