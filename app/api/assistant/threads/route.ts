import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createThread, listThreads, type AssistantOwner } from "@/lib/services/assistant";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const owner: AssistantOwner = { type: session.user.type, id: session.user.id };
  const includeArchived = request.nextUrl.searchParams.get("archived") === "1";
  return NextResponse.json({ threads: await listThreads(owner, includeArchived) });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const owner: AssistantOwner = { type: session.user.type, id: session.user.id };
  const body = await request.json().catch(() => null);
  const focusedPatientId =
    owner.type === "staff" && typeof body?.focusedPatientId === "string" ? body.focusedPatientId : null;
  const thread = await createThread(owner, focusedPatientId);
  return NextResponse.json({ thread }, { status: 201 });
}
