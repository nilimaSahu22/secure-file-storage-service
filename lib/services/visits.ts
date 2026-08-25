import { prisma } from "@/lib/prisma";

export function startVisit(patientId: string, transcript?: string) {
  return prisma.visit.create({ data: { patientId, transcript } });
}

export function getVisitById(id: string) {
  return prisma.visit.findUnique({ where: { id }, include: { patient: true } });
}

export function updateVisitTranscript(id: string, transcript: string) {
  return prisma.visit.update({ where: { id }, data: { transcript } });
}
