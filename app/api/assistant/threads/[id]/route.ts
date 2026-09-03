import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  archiveThread,
  getThread,
  getThreadMessages,
  renameThread,
  setThreadFocus,
  type AssistantOwner,
} from "@/lib/services/assistant";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const owner: AssistantOwner = { type: session.user.type, id: session.user.id };
  const { id } = await params;
  const thread = await getThread(id, owner);
  if (!thread) return NextResponse.json({ error: "NotFound" }, { status: 404 });
  const messages = await getThreadMessages(id);
  return NextResponse.json({ thread, messages });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const owner: AssistantOwner = { type: session.user.type, id: session.user.id };
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (typeof body?.title === "string") {
    const t = await renameThread(id, owner, body.title);
    if (!t) return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }
  if (typeof body?.archived === "boolean") {
    const t = await archiveThread(id, owner, body.archived);
    if (!t) return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }
  if ("focusedPatientId" in (body ?? {}) && owner.type === "staff") {
    const t = await setThreadFocus(id, owner, body.focusedPatientId || null);
    if (!t) return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }
  const thread = await getThread(id, owner);
  return NextResponse.json({ thread });
}
