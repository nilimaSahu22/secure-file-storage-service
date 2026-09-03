import { prisma } from "@/lib/prisma";
import { DocumentRequestStatus } from "@prisma/client";

export interface CreateDocumentRequestInput {
  patientId: string;
  requestedById: string;
  documentType: string;
  description: string;
  dueAt?: Date | null;
}

export function createDocumentRequest(input: CreateDocumentRequestInput) {
  return prisma.documentRequest.create({
    data: {
      patientId: input.patientId,
      requestedById: input.requestedById,
      documentType: input.documentType,
      description: input.description,
      dueAt: input.dueAt ?? null,
    },
  });
}

export function listDocumentRequests(patientId: string, opts?: { status?: DocumentRequestStatus }) {
  return prisma.documentRequest.findMany({
    where: { patientId, status: opts?.status },
    orderBy: { createdAt: "desc" },
    include: { requestedBy: { select: { name: true } } },
  });
}

export function getOpenRequests(patientId: string) {
  return prisma.documentRequest.findMany({
    where: { patientId, status: DocumentRequestStatus.PENDING },
    orderBy: { createdAt: "asc" },
  });
}

export function cancelDocumentRequest(id: string) {
  return prisma.documentRequest.update({
    where: { id },
    data: { status: DocumentRequestStatus.CANCELLED },
  });
}

export async function fulfillDocumentRequest(id: string, fileId: string) {
  const req = await prisma.documentRequest.findUnique({ where: { id } });
  if (!req || req.status !== DocumentRequestStatus.PENDING) return null;
  return prisma.documentRequest.update({
    where: { id },
    data: { status: DocumentRequestStatus.FULFILLED, fulfilledByFileId: fileId },
  });
}

/** Best-effort auto-match: a newly accepted file fulfils an open request of the same type. */
export async function autoFulfillByType(patientId: string, category: string, fileId: string) {
  const open = await getOpenRequests(patientId);
  const match = open.find(
    (r) => r.documentType.trim().toLowerCase() === category.trim().toLowerCase()
  );
  if (match) await fulfillDocumentRequest(match.id, fileId);
}
