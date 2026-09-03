import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getAnthropicClient, getModel } from "@/lib/ai/client";
import { computeTrendFlags, saveTrendNarrative } from "@/lib/services/trendFlags";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const narrativeSchema = z.object({
  narratives: z.array(z.object({ metric: z.string(), narrative: z.string() })),
});

const SYSTEM_PROMPT =
  "For each deterministic trend below (metric, direction, the numbers, and the window), write one or " +
  "two plain sentences for the treating clinician: describe the pattern and offer a cautious, " +
  "non-diagnostic consideration (e.g. 'the pattern suggests the current dose may warrant review'). Do " +
  "not diagnose, do not name specific drugs or doses, and do not label anything urgent or as a risk " +
  "score. Use only the numbers provided.";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.type !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { flags, detectedCount } = await computeTrendFlags(id);
  const pending = flags.filter((f) => !f.narrative);

  if (pending.length > 0) {
    try {
      const client = getAnthropicClient();
      const list = pending.map((f) => `- ${f.metric} (${f.direction}, ${f.window}): ${f.deterministicSummary}`).join("\n");
      const response = await client.messages.parse({
        model: getModel(),
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: list }],
        output_config: { format: zodOutputFormat(narrativeSchema) },
      });
      const narratives = response.parsed_output?.narratives ?? [];
      for (const flag of pending) {
        const match = narratives.find((n) => n.metric.toLowerCase() === flag.metric.toLowerCase());
        if (match?.narrative) await saveTrendNarrative(flag.id, match.narrative);
      }
    } catch (err) {
      console.error("Trend narrative generation failed:", err);
    }
  }

  await logAudit({
    actorType: "staff",
    actorId: session.user.id,
    actorName: session.user.name ?? "Unknown staff",
    action: "trends.computed",
    targetType: "Patient",
    targetId: id,
    metadata: { count: flags.length },
  });

  return NextResponse.json({ count: flags.length, detectedCount });
}
