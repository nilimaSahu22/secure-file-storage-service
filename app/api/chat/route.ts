import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, getModel } from "@/lib/ai/client";
import { buildChartContext } from "@/lib/ai/chartContext";
import { getPatientById } from "@/lib/services/patients";

export const dynamic = "force-dynamic";

const MAX_HISTORY_MESSAGES = 20;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function isValidHistory(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (m) =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const patientId = body?.patientId;
  const messages = body?.messages;

  if (typeof patientId !== "string" || !patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }
  if (!isValidHistory(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages must be a non-empty array" }, { status: 400 });
  }

  const patient = await getPatientById(patientId);
  if (!patient) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  const chartContext = buildChartContext(patient);
  const trimmedHistory = messages.slice(-MAX_HISTORY_MESSAGES);

  let reply: string;
  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: getModel(),
      max_tokens: 512,
      system: `You are a clinical assistant answering questions about a specific patient's chart for a clinician. Only use information from the chart context below — never invent details that aren't present. If asked something the chart doesn't cover, say so plainly. You are read-only: never propose or take actions, never suggest changing medications or the care plan as an instruction — you may summarize what is documented. Respond in plain prose only, no markdown, no headers, no bullet points. Keep answers brief and directly responsive to the question.\n\nChart context:\n${chartContext}`,
      messages: trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((b) => b.type === "text");
    reply = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    if (!reply) {
      return NextResponse.json({ error: "EmptyReply" }, { status: 502 });
    }
  } catch (err) {
    console.error("Chat assistant request failed:", err);
    return NextResponse.json({ error: "AIRequestFailed" }, { status: 502 });
  }

  return NextResponse.json({ reply });
}
