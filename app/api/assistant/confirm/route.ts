import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appendMessage, getThread, type AssistantOwner } from "@/lib/services/assistant";
import { getToolset, ToolError, type ToolContext } from "@/lib/assistant/tools";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface StoredAction {
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
  const threadId = typeof body?.threadId === "string" ? body.threadId : "";
  const actionId = typeof body?.actionId === "string" ? body.actionId : "";
  const cancel = body?.cancel === true;
  if (!threadId || !actionId) return NextResponse.json({ error: "threadId and actionId required" }, { status: 400 });

  const thread = await getThread(threadId, owner);
  if (!thread) return NextResponse.json({ error: "NotFound" }, { status: 404 });

  const candidates = await prisma.assistantMessage.findMany({
    where: { threadId, role: "assistant" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  let message: (typeof candidates)[number] | undefined;
  let actions: StoredAction[] = [];
  let action: StoredAction | undefined;
  for (const c of candidates) {
    const parsed = (c.actions as unknown as StoredAction[] | null) ?? [];
    const hit = parsed.find((a) => a.id === actionId);
    if (hit) {
      message = c;
      actions = parsed;
      action = hit;
      break;
    }
  }
  if (!message || !action) return NextResponse.json({ error: "ActionNotFound" }, { status: 404 });
  if (action.status !== "proposed") {
    return NextResponse.json({ error: "AlreadyResolved", status: action.status }, { status: 409 });
  }
  const messageId = message.id;

  async function persist(status: "done" | "failed", result: string) {
    const next = actions.map((a) => (a.id === actionId ? { ...a, status, result } : a));
    await prisma.assistantMessage.update({ where: { id: messageId }, data: { actions: next as never } });
  }

  if (cancel) {
    await persist("failed", "Dismissed by the user.");
    return NextResponse.json({ ok: true, dismissed: true });
  }

  const staffRow =
    owner.type === "staff"
      ? await prisma.staffUser.findUnique({ where: { id: owner.id }, select: { id: true, role: true } })
      : null;
  const ctx: ToolContext = {
    ownerType: owner.type,
    ownerId: owner.id,
    focusedPatientId: thread.focusedPatientId ?? (owner.type === "patient" ? owner.id : null),
    staffId: staffRow?.id ?? null,
    actorName: session.user.name ?? (owner.type === "patient" ? "Patient" : "Staff"),
    isAdmin: staffRow?.role === "ADMIN",
  };

  const tool = getToolset(ctx).find((t) => t.name === action.tool);
  if (!tool || tool.kind !== "write") {
    await persist("failed", "This action is no longer available.");
    return NextResponse.json({ error: "ToolUnavailable" }, { status: 400 });
  }

  try {
    const { message: outcome } = await tool.execute(action.params, ctx);
    await persist("done", outcome);
    await appendMessage({ threadId, role: "assistant", content: outcome });
    return NextResponse.json({ ok: true, message: outcome });
  } catch (err) {
    const reason = err instanceof ToolError ? err.message : "The action could not be completed.";
    await persist("failed", reason);
    await appendMessage({ threadId, role: "assistant", content: `I couldn't do that — ${reason}` });
    return NextResponse.json({ ok: false, message: reason }, { status: 200 });
  }
}
