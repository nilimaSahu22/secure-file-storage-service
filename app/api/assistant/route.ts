import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAnthropicClient, getAgentModel } from "@/lib/ai/client";
import { buildChartContext } from "@/lib/ai/chartContext";
import {
  buildDocumentContext,
  extractCitedFileIds,
  type GroundedChatDocument,
} from "@/lib/ai/groundedChat";
import { getPatientById } from "@/lib/services/patients";
import {
  appendMessage,
  autoTitle,
  createThread,
  getThread,
  getThreadMessages,
  type AssistantOwner,
} from "@/lib/services/assistant";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HISTORY_TURNS = 20;

const ASSISTANT_SYSTEM_PROMPT =
  "You are Meridian's clinical assistant. You only help with patients in this system — their " +
  "charts, uploaded documents, appointments, tasks, prior authorisations, referrals, visits, " +
  "follow-ups, and departmental workflows. Politely decline anything outside that scope. " +
  "Never introduce a diagnosis, medication, or clinical fact that is not explicitly present in the " +
  "patient context or documents below, and never use general medical knowledge to fill gaps. If the " +
  "information isn't there, say so plainly. When you use a document, name it exactly. Respond in plain " +
  "prose, no markdown. Reply in the language the user wrote in.";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner: AssistantOwner = { type: session.user.type, id: session.user.id };

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const language = typeof body?.language === "string" ? body.language.trim() : "";
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  // Resolve or create the thread.
  let thread = typeof body?.threadId === "string" && body.threadId ? await getThread(body.threadId, owner) : null;
  if (body?.threadId && !thread) return NextResponse.json({ error: "NotFound" }, { status: 404 });
  if (!thread) {
    thread = await createThread(owner, typeof body?.focusedPatientId === "string" ? body.focusedPatientId : null);
  }

  // Which patient is in context?
  const focusPatientId = owner.type === "patient" ? owner.id : thread.focusedPatientId;

  let context = "";
  let documents: GroundedChatDocument[] = [];
  if (focusPatientId) {
    const patient = await getPatientById(focusPatientId);
    if (patient) {
      const docCtx = buildDocumentContext(patient.files);
      documents = docCtx.documents;
      context =
        `\n\nPatient in context: ${patient.firstName} ${patient.lastName}\n` +
        `Chart:\n${buildChartContext(patient)}\n\nDocuments:\n${docCtx.context}`;
    }
  } else if (owner.type === "staff") {
    context =
      "\n\nNo patient is in context yet. Ask the user which patient they want to work with " +
      "before answering anything patient-specific.";
  }

  const history = await getThreadMessages(thread.id, HISTORY_TURNS * 2);

  let reply: string;
  try {
    const client = getAnthropicClient();
    const res = await client.messages.create({
      model: getAgentModel(),
      max_tokens: 1024,
      system:
        ASSISTANT_SYSTEM_PROMPT +
        (language ? `\n\nThe user's spoken question was detected as language "${language}".` : "") +
        context,
      messages: [
        ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: message },
      ],
    });
    const block = res.content.find((b) => b.type === "text");
    reply = block && block.type === "text" ? block.text.trim() : "";
    if (!reply) return NextResponse.json({ error: "EmptyReply" }, { status: 502 });
  } catch (err) {
    console.error("Assistant request failed:", err);
    return NextResponse.json({ error: "AIRequestFailed" }, { status: 502 });
  }

  const citedFileIds = extractCitedFileIds(reply, documents);

  await appendMessage({ threadId: thread.id, role: "user", content: message });
  const saved = await appendMessage({ threadId: thread.id, role: "assistant", content: reply, citedFileIds });

  await autoTitle(thread.id, message);
  const titled = await getThread(thread.id, owner);

  return NextResponse.json({
    threadId: thread.id,
    messageId: saved.id,
    reply,
    citedFileIds,
    title: titled?.title ?? thread.title,
  });
}
