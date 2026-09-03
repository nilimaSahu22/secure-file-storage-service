import { prisma } from "@/lib/prisma";

export function getVisitForSummary(visitId: string) {
  return prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      patient: true,
      author: true,
      note: true,
      prescription: { include: { items: { orderBy: { sortOrder: "asc" } } } },
      patientSummary: true,
    },
  });
}

export interface SavePatientSummaryInput {
  plainSummary: string;
  plainPrescription: string;
  sourceNoteVersion: number;
}

export async function savePatientSummary(visitId: string, input: SavePatientSummaryInput) {
  const visit = await prisma.visit.findUnique({ where: { id: visitId }, select: { patientId: true } });
  if (!visit) throw new Error("Visit not found");

  return prisma.patientVisitSummary.upsert({
    where: { visitId },
    create: {
      visitId,
      patientId: visit.patientId,
      plainSummary: input.plainSummary,
      plainPrescription: input.plainPrescription,
      sourceNoteVersion: input.sourceNoteVersion,
      stale: false,
    },
    update: {
      plainSummary: input.plainSummary,
      plainPrescription: input.plainPrescription,
      sourceNoteVersion: input.sourceNoteVersion,
      stale: false,
      generatedAt: new Date(),
    },
  });
}

/**
 * Marks a visit's patient-facing summary stale so it regenerates from the
 * finalized note. Safe to call before a summary row exists (draft visits).
 */
export async function markSummaryStale(visitId: string): Promise<void> {
  try {
    await prisma.patientVisitSummary.updateMany({ where: { visitId }, data: { stale: true } });
  } catch (err) {
    console.error("markSummaryStale failed:", err);
  }
}

export function getPatientSummary(visitId: string) {
  return prisma.patientVisitSummary.findUnique({ where: { visitId } });
}
