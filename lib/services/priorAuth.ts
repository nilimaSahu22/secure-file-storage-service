import { prisma } from "@/lib/prisma";
import { PriorAuthStatus } from "@prisma/client";

export function getPriorAuthsForPatient(patientId: string) {
  return prisma.priorAuthorization.findMany({
    where: { patientId },
    orderBy: { submittedAt: "desc" },
  });
}

export function getAllPriorAuths() {
  return prisma.priorAuthorization.findMany({
    orderBy: { submittedAt: "desc" },
    include: { patient: true },
  });
}

export function submitPriorAuth(patientId: string, serviceDescription: string) {
  return prisma.priorAuthorization.create({
    data: { patientId, serviceDescription, status: PriorAuthStatus.SUBMITTED },
  });
}

export function updatePriorAuthStatus(id: string, status: PriorAuthStatus) {
  return prisma.priorAuthorization.update({ where: { id }, data: { status } });
}
