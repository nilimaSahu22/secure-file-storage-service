import { prisma } from "@/lib/prisma";
import { getAnthropicClient, getAgentModel } from "@/lib/ai/client";
import type { Prisma } from "@prisma/client";

export interface AssistantOwner {
  type: "staff" | "patient";
  id: string;
}

const DEFAULT_TITLE = "New conversation";

export function listThreads(owner: AssistantOwner, includeArchived = false) {
  return prisma.assistantThread.findMany({
    where: { ownerType: owner.type, ownerId: owner.id, archived: includeArchived ? undefined : false },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, focusedPatientId: true, archived: true, updatedAt: true },
  });
}

export async function getThread(id: string, owner: AssistantOwner) {
  const thread = await prisma.assistantThread.findUnique({ where: { id } });
  if (!thread || thread.ownerType !== owner.type || thread.ownerId !== owner.id) return null;
  return thread;
}

export function createThread(owner: AssistantOwner, focusedPatientId?: string | null) {
  return prisma.assistantThread.create({
    data: { ownerType: owner.type, ownerId: owner.id, focusedPatientId: focusedPatientId ?? null },
  });
}

export async function renameThread(id: string, owner: AssistantOwner, title: string) {
  const thread = await getThread(id, owner);
  if (!thread) return null;
  return prisma.assistantThread.update({ where: { id }, data: { title: title.slice(0, 120) } });
}

export async function archiveThread(id: string, owner: AssistantOwner, archived: boolean) {
  const thread = await getThread(id, owner);
  if (!thread) return null;
  return prisma.assistantThread.update({ where: { id }, data: { archived } });
}

export async function setThreadFocus(id: string, owner: AssistantOwner, focusedPatientId: string | null) {
  const thread = await getThread(id, owner);
  if (!thread) return null;
  return prisma.assistantThread.update({ where: { id }, data: { focusedPatientId } });
}

export function getThreadMessages(threadId: string, take = 40) {
  return prisma.assistantMessage
    .findMany({ where: { threadId }, orderBy: { createdAt: "desc" }, take })
    .then((rows) => rows.reverse());
}

export interface AssistantMessageView {
  id: string;
  role: "user" | "assistant";
  content: string;
  citedFiles: { id: string; fileName: string }[];
  actions: unknown;
}

/** Thread messages shaped for rendering — cited file names resolved, actions passed through. */
export async function getThreadMessagesForView(threadId: string, take = 40): Promise<AssistantMessageView[]> {
  const rows = await getThreadMessages(threadId, take);
  const fileIds = [...new Set(rows.flatMap((r) => r.citedFileIds))];
  const files = fileIds.length
    ? await prisma.medicalFile.findMany({ where: { id: { in: fileIds } }, select: { id: true, fileName: true } })
    : [];
  const byId = new Map(files.map((f) => [f.id, f.fileName]));
  return rows.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    citedFiles: m.citedFileIds.map((fid) => ({ id: fid, fileName: byId.get(fid) ?? "document" })),
    actions: m.actions ?? null,
  }));
}

export interface AppendMessageInput {
  threadId: string;
  role: "user" | "assistant";
  content: string;
  citedFileIds?: string[];
  actions?: Prisma.InputJsonValue;
}

export async function appendMessage(input: AppendMessageInput) {
  const message = await prisma.assistantMessage.create({
    data: {
      threadId: input.threadId,
      role: input.role,
      content: input.content,
      citedFileIds: input.citedFileIds ?? [],
      actions: input.actions,
    },
  });
  await prisma.assistantThread.update({ where: { id: input.threadId }, data: { updatedAt: new Date() } });
  return message;
}

/** Names an untitled thread from its first user message. Best-effort. */
export async function autoTitle(threadId: string, firstMessage: string): Promise<void> {
  const thread = await prisma.assistantThread.findUnique({ where: { id: threadId }, select: { title: true } });
  if (!thread || thread.title !== DEFAULT_TITLE) return;

  let title = firstMessage.trim().split(/\s+/).slice(0, 8).join(" ");
  try {
    const client = getAnthropicClient();
    const res = await client.messages.create({
      model: getAgentModel(),
      max_tokens: 20,
      system:
        "Give a 3-6 word title for a conversation that starts with this message. " +
        "Title case, no quotes, no trailing punctuation.",
      messages: [{ role: "user", content: firstMessage.slice(0, 500) }],
    });
    const block = res.content.find((b) => b.type === "text");
    if (block && block.type === "text" && block.text.trim()) {
      title = block.text.trim().replace(/^["']|["']$/g, "").slice(0, 80);
    }
  } catch (err) {
    console.error("autoTitle failed:", err);
  }

  await prisma.assistantThread.update({ where: { id: threadId }, data: { title } });
}
