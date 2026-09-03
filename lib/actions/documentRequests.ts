"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { cancelDocumentRequest, createDocumentRequest } from "@/lib/services/documentRequests";

export async function createDocumentRequestAction(input: {
  patientId: string;
  documentType: string;
  description: string;
  dueAt?: string | null;
}) {
  const session = await auth();
  if (!session || session.user.type !== "staff") throw new Error("Forbidden");

  const staff = await prisma.staffUser.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!staff) throw new Error("Your session is out of date — please log in again.");

  const req = await createDocumentRequest({
    patientId: input.patientId,
    requestedById: staff.id,
    documentType: input.documentType.trim(),
    description: input.description.trim(),
    dueAt: input.dueAt ? new Date(`${input.dueAt}T00:00:00`) : null,
  });

  await logAudit({
    actorType: "staff",
    actorId: staff.id,
    actorName: session.user.name ?? "Unknown staff",
    action: "documentrequest.created",
    targetType: "DocumentRequest",
    targetId: req.id,
    metadata: { patientId: input.patientId, documentType: input.documentType },
  });

  revalidatePath(`/dashboard/patients/${input.patientId}`);
  revalidatePath("/portal");
  return { id: req.id };
}

export async function cancelDocumentRequestAction(id: string) {
  const session = await auth();
  if (!session || session.user.type !== "staff") throw new Error("Forbidden");
  const req = await prisma.documentRequest.findUnique({ where: { id }, select: { patientId: true } });
  if (!req) throw new Error("Not found");
  await cancelDocumentRequest(id);
  await logAudit({
    actorType: "staff",
    actorId: session.user.id,
    actorName: session.user.name ?? "Unknown staff",
    action: "documentrequest.cancelled",
    targetType: "DocumentRequest",
    targetId: id,
  });
  revalidatePath(`/dashboard/patients/${req.patientId}`);
  return { ok: true };
}
