import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listNotifications, unreadCount, type NotificationRecipient } from "@/lib/services/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recipient: NotificationRecipient = { type: session.user.type, id: session.user.id };
  const [notifications, unread] = await Promise.all([
    listNotifications(recipient),
    unreadCount(recipient),
  ]);

  return NextResponse.json({
    unread,
    notifications: notifications.map((n) => ({
      id: n.id,
      category: n.category,
      title: n.title,
      body: n.body,
      linkPath: n.linkPath,
      read: n.readAt !== null,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}
