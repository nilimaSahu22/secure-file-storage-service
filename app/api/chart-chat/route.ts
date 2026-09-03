import { NextRequest, NextResponse } from "next/server";
import { ChatActorType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient, getModel } from "@/lib/ai/client";
import { buildDocumentContext, extractCitedFileIds, GROUNDED_CHAT_SYSTEM_PROMPT } from "@/lib/ai/groundedChat";
import { buildChartContext } from "@/lib/ai/chartContext";
import { getPatientById } from "@/lib/services/patients";

export const dynamic = "force-dynamic";

const MAX_HISTORY_MESSAGES = 20;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const patientId = body?.patientId;
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  // Optional BCP-47 hint from voice input (Deepgram's detected language). The prompt
  // already asks the model to mirror the user's language; this reinforces it for
  // spoken questions, where transliteration can make the text language ambiguous.
  const language = typeof body?.language === "string" ? body.language.trim() : "";

  if (typeof patientId !== "string" || !patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  if (session.user.type === "patient" && session.user.id !== patientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorType: ChatActorType = session.user.type === "patient" ? ChatActorType.PATIENT : ChatActorType.DOCTOR;

  const [patient, history, staff] = await Promise.all([
    getPatientById(patientId),
    prisma.chatMessage.findMany({
      where: { patientId, actorType },
      orderBy: { createdAt: "asc" },
      take: MAX_HISTORY_MESSAGES,
    }),
    // Resolve the staff row so a session left over from an earlier DB reset
    // (stale JWT → non-existent staff id) doesn't trip the staffId foreign key.
    session.user.type === "staff"
      ? prisma.staffUser.findUnique({ where: { id: session.user.id }, select: { id: true } })
      : Promise.resolve(null),
  ]);
  const staffId = staff?.id;

  if (!patient) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  const chartContext = buildChartContext(patient);
  const { context, documents } = buildDocumentContext(patient.files);

  await prisma.chatMessage.create({
    data: { patientId, actorType, staffId, role: "user", content },
  });

  let reply: string;
  let citedFileIds: string[] = [];
  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: getModel(),
      max_tokens: 512,
      system: `${GROUNDED_CHAT_SYSTEM_PROMPT}${
        language ? `\n\nThe user's spoken question was detected as language "${language}". Reply in that language.` : ""
      }\n\nPatient chart:\n${chartContext}\n\nDocuments:\n${context}`,
      messages: [
        ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    reply = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    if (!reply) {
      return NextResponse.json({ error: "EmptyReply" }, { status: 502 });
    }
    citedFileIds = extractCitedFileIds(reply, documents);
  } catch (err) {
    console.error("Grounded chart chat request failed:", err);
    return NextResponse.json({ error: "AIRequestFailed" }, { status: 502 });
  }

  const saved = await prisma.chatMessage.create({
    data: { patientId, actorType, staffId, role: "assistant", content: reply, citedFileIds },
  });

  return NextResponse.json({ id: saved.id, reply, citedFileIds });
}
