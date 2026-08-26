import { prisma } from "@/lib/prisma";

export function getPatientPortalData(patientId: string) {
  return prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      appointments: { orderBy: { scheduledAt: "desc" }, include: { provider: true } },
      files: { orderBy: [{ category: "asc" }, { version: "desc" }] },
      chatMessages: { where: { actorType: "PATIENT" }, orderBy: { createdAt: "asc" } },
    },
  });
}

export type PatientPortalData = NonNullable<Awaited<ReturnType<typeof getPatientPortalData>>>;
