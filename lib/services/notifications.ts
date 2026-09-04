import { prisma } from "@/lib/prisma";

export type NotificationCategory =
  | "appointment"
  | "task"
  | "document"
  | "priorauth"
  | "referral"
  | "visit"
  | "message";

export interface NotificationRecipient {
  type: "staff" | "patient";
  id: string;
}

interface CreateNotificationInput {
  recipient: NotificationRecipient;
  category: NotificationCategory;
  title: string;
  body: string;
  linkPath?: string | null;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      recipientType: input.recipient.type,
      recipientId: input.recipient.id,
      category: input.category,
      title: input.title,
      body: input.body,
      linkPath: input.linkPath ?? null,
    },
  });
}

/** Fire-and-forget: a notification failure should never break the action that triggered it. */
export function notify(input: CreateNotificationInput): Promise<unknown> {
  return createNotification(input).catch((err) => {
    console.error("notify failed:", err);
    return null;
  });
}

export function notifyStaff(
  staffId: string,
  n: Omit<CreateNotificationInput, "recipient">
): Promise<unknown> {
  return notify({ ...n, recipient: { type: "staff", id: staffId } });
}

export function notifyPatient(
  patientId: string,
  n: Omit<CreateNotificationInput, "recipient">
): Promise<unknown> {
  return notify({ ...n, recipient: { type: "patient", id: patientId } });
}

export function listNotifications(recipient: NotificationRecipient, take = 30) {
  return prisma.notification.findMany({
    where: { recipientType: recipient.type, recipientId: recipient.id },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export function unreadCount(recipient: NotificationRecipient) {
  return prisma.notification.count({
    where: { recipientType: recipient.type, recipientId: recipient.id, readAt: null },
  });
}

export function markRead(recipient: NotificationRecipient, id: string) {
  return prisma.notification.updateMany({
    where: { id, recipientType: recipient.type, recipientId: recipient.id, readAt: null },
    data: { readAt: new Date() },
  });
}

export function markAllRead(recipient: NotificationRecipient) {
  return prisma.notification.updateMany({
    where: { recipientType: recipient.type, recipientId: recipient.id, readAt: null },
    data: { readAt: new Date() },
  });
}
