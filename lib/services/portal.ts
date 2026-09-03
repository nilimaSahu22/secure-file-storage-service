import { prisma } from "@/lib/prisma";

export function getPatientPortalData(patientId: string) {
  return prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      appointments: { orderBy: { scheduledAt: "desc" }, include: { provider: true } },
      files: { orderBy: [{ category: "asc" }, { version: "desc" }] },
      chatMessages: { where: { actorType: "PATIENT" }, orderBy: { createdAt: "asc" } },
      followUpItems: {
        where: { status: "OUTSTANDING" },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      },
      documentRequests: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: { requestedBy: { select: { name: true } } },
      },
      visits: {
        where: { status: "SIGNED" },
        orderBy: { signedAt: "desc" },
        include: {
          author: true,
          signedBy: true,
          note: true,
          prescription: { include: { items: { orderBy: { sortOrder: "asc" } } } },
          patientSummary: true,
        },
      },
    },
  });
}

export type PatientPortalData = NonNullable<Awaited<ReturnType<typeof getPatientPortalData>>>;
