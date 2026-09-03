"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { dismissTrendFlag } from "@/lib/services/trendFlags";

export async function dismissTrendFlagAction(id: string) {
  const session = await auth();
  if (!session || session.user.type !== "staff") throw new Error("Forbidden");

  const flag = await prisma.trendFlag.findUnique({ where: { id }, select: { patientId: true } });
  if (!flag) throw new Error("Not found");

  await dismissTrendFlag(id);
  await logAudit({
    actorType: "staff",
    actorId: session.user.id,
    actorName: session.user.name ?? "Unknown staff",
    action: "trends.dismissed",
    targetType: "TrendFlag",
    targetId: id,
  });
  revalidatePath(`/dashboard/patients/${flag.patientId}`);
  return { ok: true };
}
