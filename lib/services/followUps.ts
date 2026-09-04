import { prisma } from "@/lib/prisma";
import { FollowUpKind, FollowUpStatus } from "@prisma/client";

const IMAGING_HINTS = ["x-ray", "xray", "mri", "ct ", "ct scan", "ultrasound", "scan", "imaging", "mammogram"];

function investigationKind(name: string): FollowUpKind {
  const lower = name.toLowerCase();
  return IMAGING_HINTS.some((h) => lower.includes(h)) ? FollowUpKind.IMAGING : FollowUpKind.TEST;
}

/** Idempotently derives follow-up items from a signed visit's prescription + plan. */
export async function generateFollowUpsForVisit(visitId: string): Promise<number> {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: { prescription: true, note: true, followUpItems: true },
  });
  if (!visit || visit.status !== "SIGNED" || !visit.prescription) return 0;

  const existing = new Set(visit.followUpItems.map((f) => `${f.kind}:${f.description.toLowerCase()}`));
  const toCreate: {
    patientId: string;
    visitId: string;
    kind: FollowUpKind;
    description: string;
    dueAt: Date | null;
  }[] = [];

  for (const inv of visit.prescription.investigations) {
    const kind = investigationKind(inv);
    if (!existing.has(`${kind}:${inv.toLowerCase()}`)) {
      toCreate.push({
        patientId: visit.patientId,
        visitId,
        kind,
        description: inv,
        dueAt: visit.prescription.followUpAt,
      });
    }
  }

  if (visit.prescription.followUpAt) {
    const desc = "Attend your follow-up visit";
    if (!existing.has(`${FollowUpKind.APPOINTMENT}:${desc.toLowerCase()}`)) {
      // A newer visit sets a new "next appointment" — supersede any earlier
      // outstanding follow-up appointment so the patient sees only one.
      await prisma.followUpItem.updateMany({
        where: {
          patientId: visit.patientId,
          kind: FollowUpKind.APPOINTMENT,
          status: FollowUpStatus.OUTSTANDING,
          visitId: { not: visitId },
        },
        data: { status: FollowUpStatus.DISMISSED },
      });
      toCreate.push({
        patientId: visit.patientId,
        visitId,
        kind: FollowUpKind.APPOINTMENT,
        description: desc,
        dueAt: visit.prescription.followUpAt,
      });
    }
  }

  const planLower = (visit.note?.plan ?? "").toLowerCase();
  if ((planLower.includes("refer") || planLower.includes("referral")) &&
      !existing.has(`${FollowUpKind.REFERRAL}:complete the specialist referral`)) {
    toCreate.push({
      patientId: visit.patientId,
      visitId,
      kind: FollowUpKind.REFERRAL,
      description: "Complete the specialist referral",
      dueAt: null,
    });
  }

  if (toCreate.length === 0) return 0;
  await prisma.followUpItem.createMany({ data: toCreate });
  return toCreate.length;
}

export async function createResultAvailableFollowUp(testResultId: string): Promise<void> {
  const result = await prisma.testResult.findUnique({ where: { id: testResultId } });
  if (!result) return;
  const description = `New result available: ${result.testName}`;
  const dup = await prisma.followUpItem.findFirst({
    where: { patientId: result.patientId, kind: FollowUpKind.RESULT_AVAILABLE, description },
  });
  if (dup) return;
  await prisma.followUpItem.create({
    data: {
      patientId: result.patientId,
      kind: FollowUpKind.RESULT_AVAILABLE,
      description,
      status: FollowUpStatus.OUTSTANDING,
      satisfiedByTestResultId: testResultId,
    },
  });
}

export function getOutstandingFollowUps(patientId: string) {
  return prisma.followUpItem.findMany({
    where: { patientId, status: FollowUpStatus.OUTSTANDING },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  });
}

export function completeFollowUp(id: string) {
  return prisma.followUpItem.update({ where: { id }, data: { status: FollowUpStatus.COMPLETED } });
}

export function dismissFollowUp(id: string) {
  return prisma.followUpItem.update({ where: { id }, data: { status: FollowUpStatus.DISMISSED } });
}

/** Clear every outstanding "result available" item for a patient in one go. */
export function markResultsSeen(patientId: string) {
  return prisma.followUpItem.updateMany({
    where: {
      patientId,
      kind: FollowUpKind.RESULT_AVAILABLE,
      status: FollowUpStatus.OUTSTANDING,
    },
    data: { status: FollowUpStatus.COMPLETED },
  });
}
