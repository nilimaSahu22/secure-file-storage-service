import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type Anthropic from "@anthropic-ai/sdk";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient, getAgentModel } from "@/lib/ai/client";
import { buildChartContext } from "@/lib/ai/chartContext";
import { buildDocumentContext } from "@/lib/ai/groundedChat";
import { getPatientById } from "@/lib/services/patients";
import {
  appendMessage,
  autoTitle,
  createThread,
  getThread,
  getThreadMessages,
  type AssistantOwner,
} from "@/lib/services/assistant";
import { getToolset, toAnthropicTools, ToolError, type ToolContext } from "@/lib/assistant/tools";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HISTORY_TURNS = 20;
const MAX_ITERATIONS = 6;

const SYSTEM_PROMPT =
  "You are Meridian's clinical assistant. You only help with patients in this system — charts, " +
  "uploaded documents, appointments, tasks, prior authorisations, referrals, visits, follow-ups, " +
  "and departmental workflows. Politely decline anything else.\n" +
  "Use the tools to look things up — never guess at chart data or invent clinical facts, and when " +
  "you use a document, name it exactly.\n" +
  "For anything that CHANGES data (booking, cancelling, creating tasks/referrals/prior-auths, " +
  "completing reminders): call the tool ONCE, then STOP. The tool will not perform the action — it " +
  "needs the user's confirmation. Tell the user plainly what you're about to do and wait. Never say " +
  "you have done something before it is confirmed.\n" +
  "Respond in plain prose, no markdown. Reply in the language the user wrote in.";

interface ProposedAction {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  summary: string;
  status: "proposed" | "done" | "failed";
  result?: string;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner: AssistantOwner = { type: session.user.type, id: session.user.id };

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const language = typeof body?.language === "string" ? body.language.trim() : "";
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  let thread = typeof body?.threadId === "string" && body.threadId ? await getThread(body.threadId, owner) : null;
  if (body?.threadId && !thread) return NextResponse.json({ error: "NotFound" }, { status: 404 });
  if (!thread) {
    thread = await createThread(owner, typeof body?.focusedPatientId === "string" ? body.focusedPatientId : null);
  }

  const focusPatientId = owner.type === "patient" ? owner.id : thread.focusedPatientId;

  // Resolve a real staff row so a stale session doesn't trip a FK on audit/write.
  const staffRow =
    owner.type === "staff"
      ? await prisma.staffUser.findUnique({ where: { id: owner.id }, select: { id: true, role: true } })
      : null;

  const ctx: ToolContext = {
    ownerType: owner.type,
    ownerId: owner.id,
    focusedPatientId: focusPatientId ?? null,
    staffId: staffRow?.id ?? null,
    actorName: session.user.name ?? (owner.type === "patient" ? "Patient" : "Staff"),
    isAdmin: staffRow?.role === "ADMIN",
  };

  const tools = getToolset(ctx);
  const toolByName = new Map(tools.map((t) => [t.name, t]));

  // Patient context for grounding + citations.
  let contextBlock = "";
  let acceptedFiles: { id: string; fileName: string }[] = [];
  if (focusPatientId) {
    const patient = await getPatientById(focusPatientId);
    if (patient) {
      acceptedFiles = patient.files
        .filter((f) => f.status === "ACCEPTED")
        .map((f) => ({ id: f.id, fileName: f.fileName }));
      const docCtx = buildDocumentContext(patient.files);
      contextBlock =
        `\n\nPatient in context: ${patient.firstName} ${patient.lastName}\n` +
        `Chart:\n${buildChartContext(patient)}\n\nAvailable documents: ${
          docCtx.documents.map((d) => d.fileName).join(", ") || "none"
        }`;
    }
  } else if (owner.type === "staff") {
    contextBlock = "\n\nNo patient is in context. Ask which patient, or use find_patient, before anything patient-specific.";
  }

  const history = await getThreadMessages(thread.id, HISTORY_TURNS * 2);
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message },
  ];

  const client = getAnthropicClient();
  const proposedActions: ProposedAction[] = [];
  let reply = "";

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const res = await client.messages.create({
        model: getAgentModel(),
        max_tokens: 1500,
        system:
          SYSTEM_PROMPT +
          (language ? `\n\nThe user's spoken question was detected as language "${language}".` : "") +
          contextBlock,
        tools: toAnthropicTools(tools),
        messages,
      });

      const textBlocks = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
      if (textBlocks.length) reply = textBlocks.map((b) => b.text).join("\n").trim();

      if (res.stop_reason !== "tool_use") break;

      const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      messages.push({ role: "assistant", content: res.content });

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const tool = toolByName.get(tu.name);
        const input = (tu.input ?? {}) as Record<string, unknown>;
        if (!tool) {
          results.push({ type: "tool_result", tool_use_id: tu.id, content: "Unknown tool.", is_error: true });
          continue;
        }
        if (tool.kind === "read") {
          try {
            const out = await tool.run(input, ctx);
            results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(out).slice(0, 12000) });
          } catch (err) {
            results.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: err instanceof ToolError ? err.message : "Tool failed.",
              is_error: true,
            });
          }
        } else {
          let summary = tool.description;
          try {
            summary = await tool.describe(input, ctx);
          } catch {
            /* keep default */
          }
          const action: ProposedAction = { id: randomUUID(), tool: tool.name, params: input, summary, status: "proposed" };
          proposedActions.push(action);
          results.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content:
              "NOT PERFORMED — this action needs the user's confirmation. Tell the user in one sentence " +
              "what you will do and then stop.",
          });
        }
      }
      messages.push({ role: "user", content: results });
      if (proposedActions.length) {
        // one more turn so the model can phrase the proposal, then we stop
        const finalRes = await client.messages.create({
          model: getAgentModel(),
          max_tokens: 400,
          system: SYSTEM_PROMPT + contextBlock,
          messages,
        });
        const fb = finalRes.content.find((b): b is Anthropic.TextBlock => b.type === "text");
        if (fb) reply = fb.text.trim();
        break;
      }
    }
    if (!reply) reply = "Done.";
  } catch (err) {
    console.error("Assistant loop failed:", err);
    return NextResponse.json({ error: "AIRequestFailed" }, { status: 502 });
  }

  const citedFiles = acceptedFiles.filter((f) => reply.includes(f.fileName));

  await appendMessage({ threadId: thread.id, role: "user", content: message });
  const saved = await appendMessage({
    threadId: thread.id,
    role: "assistant",
    content: reply,
    citedFileIds: citedFiles.map((f) => f.id),
    actions: proposedActions.length ? (proposedActions as unknown as Prisma.InputJsonValue) : undefined,
  });

  await autoTitle(thread.id, message);
  const titled = await getThread(thread.id, owner);

  return NextResponse.json({
    threadId: thread.id,
    messageId: saved.id,
    reply,
    citedFiles,
    actions: proposedActions,
    title: titled?.title ?? thread.title,
  });
}
