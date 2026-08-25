import { prisma } from "@/lib/prisma";
import { ReferralStatus } from "@prisma/client";

export function getReferralsForPatient(patientId: string) {
  return prisma.referral.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    include: { fromProvider: true, toProvider: true },
  });
}

export interface CreateReferralInput {
  patientId: string;
  fromProviderId: string;
  toProviderId: string;
  reason: string;
}

export function createReferral(input: CreateReferralInput) {
  return prisma.referral.create({ data: input });
}

export function updateReferralStatus(id: string, status: ReferralStatus) {
  return prisma.referral.update({ where: { id }, data: { status } });
}
