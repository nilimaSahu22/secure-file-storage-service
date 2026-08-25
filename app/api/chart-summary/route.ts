import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, getModel } from "@/lib/ai/client";
import { buildChartContext } from "@/lib/ai/chartContext";
import { getPatientById } from "@/lib/services/patients";
import { saveChartSummary } from "@/lib/services/chartSummary";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const patientId = body?.patientId;

  if (typeof patientId !== "string" || !patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  const patient = await getPatientById(patientId);
  if (!patient) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  const chartContext = buildChartContext(patient);

  let summaryText: string;
  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: getModel(),
      max_tokens: 512,
      system:
        "You are a clinical documentation assistant. Summarize the patient chart below in 3-4 concise sentences for a clinician reviewing the chart before a visit. Focus on active problems, notable trends, and anything requiring attention. Do not invent information not present in the chart. Respond in plain prose only — no markdown, no headers, no bullet points, no bold or italic formatting. Write it as sentences a clinician would read in a single paragraph.",
      messages: [{ role: "user", content: chartContext }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    summaryText = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    if (!summaryText) {
      return NextResponse.json({ error: "EmptySummary" }, { status: 502 });
    }
  } catch (err) {
    console.error("Chart summary generation failed:", err);
    return NextResponse.json({ error: "AIRequestFailed" }, { status: 502 });
  }

  const saved = await saveChartSummary(patientId, summaryText);
  return NextResponse.json({ summary: saved.summary, generatedAt: saved.generatedAt });
}
