import { prisma } from "@/lib/prisma";

export function getPatients() {
  return prisma.patient.findMany({
    orderBy: { lastName: "asc" },
  });
}

export function searchPatients(query: string) {
  if (!query.trim()) return getPatients();

  return prisma.patient.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { contactEmail: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { lastName: "asc" },
  });
}

export function getPatientById(id: string) {
  return prisma.patient.findUnique({
    where: { id },
    include: {
      medications: { orderBy: { prescribedAt: "desc" } },
      allergies: true,
      vitals: { orderBy: { recordedAt: "desc" } },
      testResults: { orderBy: { recordedAt: "desc" } },
      notes: {
        orderBy: { createdAt: "desc" },
        include: {
          author: true,
          codingSuggestions: true,
          visit: {
            include: {
              signedBy: true,
              prescription: { include: { items: { orderBy: { sortOrder: "asc" } } } },
            },
          },
        },
      },
      appointments: { orderBy: { scheduledAt: "desc" }, include: { provider: true } },
      tasks: { orderBy: { createdAt: "desc" }, include: { assignedTo: true } },
      priorAuths: { orderBy: { submittedAt: "desc" } },
      referrals: {
        orderBy: { createdAt: "desc" },
        include: { fromProvider: true, toProvider: true },
      },
      chartSummaries: { orderBy: { generatedAt: "desc" }, take: 1 },
      alerts: { orderBy: { triggeredAt: "desc" } },
      files: { orderBy: [{ category: "asc" }, { version: "desc" }] },
      chatMessages: {
        where: { actorType: "DOCTOR" },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export type PatientWithChart = NonNullable<Awaited<ReturnType<typeof getPatientById>>>;

export function getPatientBasic(id: string) {
  return prisma.patient.findUnique({ where: { id } });
}
