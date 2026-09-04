"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { completeFollowUp, dismissFollowUp, markResultsSeen } from "@/lib/services/followUps";

async function authorizeFollowUp(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const item = await prisma.followUpItem.findUnique({ where: { id }, select: { patientId: true } });
  if (!item) throw new Error("Not found");
  if (session.user.type === "patient" && session.user.id !== item.patientId) {
    throw new Error("Forbidden");
  }
  return { session, patientId: item.patientId };
}

export async function completeFollowUpAction(id: string) {
  const { session, patientId } = await authorizeFollowUp(id);
  await completeFollowUp(id);
  await logAudit({
    actorType: session.user.type === "patient" ? "patient" : "staff",
    actorId: session.user.id,
    actorName: session.user.name ?? "Unknown",
    action: "followup.completed",
    targetType: "FollowUpItem",
    targetId: id,
  });
  revalidatePath("/portal");
  revalidatePath(`/dashboard/patients/${patientId}`);
  return { ok: true };
}

export async function markResultsSeenAction() {
  const session = await auth();
  if (!session || session.user.type !== "patient") throw new Error("Unauthorized");
  await markResultsSeen(session.user.id);
  await logAudit({
    actorType: "patient",
    actorId: session.user.id,
    actorName: session.user.name ?? "Unknown",
    action: "followup.results_seen",
    targetType: "FollowUpItem",
  });
  revalidatePath("/portal");
  revalidatePath(`/dashboard/patients/${session.user.id}`);
  return { ok: true };
}

export async function dismissFollowUpAction(id: string) {
  const { session, patientId } = await authorizeFollowUp(id);
  await dismissFollowUp(id);
  await logAudit({
    actorType: session.user.type === "patient" ? "patient" : "staff",
    actorId: session.user.id,
    actorName: session.user.name ?? "Unknown",
    action: "followup.dismissed",
    targetType: "FollowUpItem",
    targetId: id,
  });
  revalidatePath("/portal");
  revalidatePath(`/dashboard/patients/${patientId}`);
  return { ok: true };
}
