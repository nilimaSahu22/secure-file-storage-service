import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markAllRead, markRead, type NotificationRecipient } from "@/lib/services/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recipient: NotificationRecipient = { type: session.user.type, id: session.user.id };
  const body = await request.json().catch(() => ({}));

  if (body?.all) {
    await markAllRead(recipient);
  } else if (typeof body?.id === "string") {
    await markRead(recipient, body.id);
  } else {
    return NextResponse.json({ error: "id or all is required" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
