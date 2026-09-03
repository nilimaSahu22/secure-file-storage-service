import { prisma } from "@/lib/prisma";
import { VisitStatus } from "@prisma/client";
import type { DrugAllergyConflict } from "@/lib/clinical/rules";
import { createMedicationFromPrescriptionItem } from "@/lib/services/medications";
import { generateFollowUpTasks } from "@/lib/services/autoTasks";

export class VisitLockedError extends Error {
  constructor() {
    super("This visit is signed and can no longer be edited.");
    this.name = "VisitLockedError";
  }
}

export interface DraftItemInput {
  medicationName: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string | null;
  instructions: string | null;
}

export interface DraftPrescriptionInput {
  items: DraftItemInput[];
  investigations: string[];
  advice: string | null;
  followUpAt: Date | null;
}

export interface CreateVisitInput {
  patientId: string;
  authorId: string;
  transcript?: string;
  soap: { subjective: string; objective: string; assessment: string; plan: string };
  isAiGenerated?: boolean;
  prescription: DraftPrescriptionInput;
}

const visitInclude = {
  patient: { include: { allergies: true } },
  author: true,
  signedBy: true,
  note: true,
  prescription: { include: { items: { orderBy: { sortOrder: "asc" as const } } } },
};

export async function createVisitWithNote(input: CreateVisitInput) {
  const visit = await prisma.$transaction(async (tx) => {
    const created = await tx.visit.create({
      data: {
        patientId: input.patientId,
        authorId: input.authorId,
        transcript: input.transcript,
        status: VisitStatus.DRAFT,
        note: {
          create: {
            patientId: input.patientId,
            authorId: input.authorId,
            subjective: input.soap.subjective,
            objective: input.soap.objective,
            assessment: input.soap.assessment,
            plan: input.soap.plan,
            isAiGenerated: input.isAiGenerated ?? false,
          },
        },
        prescription: {
          create: {
            patientId: input.patientId,
            investigations: input.prescription.investigations,
            advice: input.prescription.advice,
            followUpAt: input.prescription.followUpAt,
            items: {
              create: input.prescription.items.map((item, i) => ({
                medicationName: item.medicationName,
                dose: item.dose,
                route: item.route,
                frequency: item.frequency,
                duration: item.duration,
                instructions: item.instructions,
                sortOrder: i,
              })),
            },
          },
        },
      },
      include: { note: true },
    });
    return created;
  });

  if (visit.note) await generateFollowUpTasks(visit.note);
  return visit;
}

export function getVisitById(id: string) {
  return prisma.visit.findUnique({ where: { id }, include: visitInclude });
}

export type VisitWithDetail = NonNullable<Awaited<ReturnType<typeof getVisitById>>>;

export interface UpdateDraftVisitInput {
  soap: { subjective: string; objective: string; assessment: string; plan: string };
  prescription: DraftPrescriptionInput;
}

export async function updateDraftVisit(id: string, input: UpdateDraftVisitInput) {
  const visit = await prisma.visit.findUnique({
    where: { id },
    include: { note: true, prescription: true },
  });
  if (!visit) throw new Error("Visit not found");
  if (visit.status !== VisitStatus.DRAFT) throw new VisitLockedError();

  await prisma.$transaction(async (tx) => {
    if (visit.note) {
      await tx.clinicalNote.update({
        where: { id: visit.note.id },
        data: {
          subjective: input.soap.subjective,
          objective: input.soap.objective,
          assessment: input.soap.assessment,
          plan: input.soap.plan,
          noteVersion: { increment: 1 },
        },
      });
    }
    if (visit.prescription) {
      await tx.prescriptionItem.deleteMany({ where: { prescriptionId: visit.prescription.id } });
      await tx.prescription.update({
        where: { id: visit.prescription.id },
        data: {
          investigations: input.prescription.investigations,
          advice: input.prescription.advice,
          followUpAt: input.prescription.followUpAt,
          items: {
            create: input.prescription.items.map((item, i) => ({
              medicationName: item.medicationName,
              dose: item.dose,
              route: item.route,
              frequency: item.frequency,
              duration: item.duration,
              instructions: item.instructions,
              sortOrder: i,
            })),
          },
        },
      });
    }
  });

  return { patientId: visit.patientId };
}

export interface SignVisitResult {
  visit: VisitWithDetail;
  patientId: string;
  noteId: string | null;
  prescription: { id: string; investigations: string[]; advice: string | null; followUpAt: Date | null; items: DraftItemInput[] };
  medicationsCreated: number;
  conflicts: DrugAllergyConflict[];
}

export async function signVisit(id: string, signedById: string, signerName: string): Promise<SignVisitResult> {
  const existing = await prisma.visit.findUnique({
    where: { id },
    include: { prescription: { include: { items: { orderBy: { sortOrder: "asc" } } } }, note: true },
  });
  if (!existing) throw new Error("Visit not found");
  if (existing.status !== VisitStatus.DRAFT) throw new VisitLockedError();

  const now = new Date();
  const signatureStatement = `Electronically signed by ${signerName} on ${now.toISOString().slice(0, 10)}`;
  const conflicts: DrugAllergyConflict[] = [];
  let medicationsCreated = 0;

  await prisma.$transaction(async (tx) => {
    await tx.visit.update({
      where: { id },
      data: { status: VisitStatus.SIGNED, signedAt: now, signedById, signatureStatement },
    });
    if (existing.prescription) {
      await tx.prescription.update({
        where: { id: existing.prescription.id },
        data: { finalizedAt: now },
      });
      for (const item of existing.prescription.items) {
        const { medicationId, conflicts: itemConflicts } = await createMedicationFromPrescriptionItem(tx, {
          patientId: existing.patientId,
          visitId: id,
          prescribedById: signedById,
          item: {
            medicationName: item.medicationName,
            dose: item.dose,
            route: item.route,
            frequency: item.frequency,
            duration: item.duration,
          },
        });
        await tx.prescriptionItem.update({ where: { id: item.id }, data: { medicationId } });
        medicationsCreated += 1;
        conflicts.push(...itemConflicts);
      }
    }
  });

  const visit = (await getVisitById(id))!;
  return {
    visit,
    patientId: visit.patientId,
    noteId: visit.note?.id ?? null,
    prescription: {
      id: visit.prescription?.id ?? "",
      investigations: visit.prescription?.investigations ?? [],
      advice: visit.prescription?.advice ?? null,
      followUpAt: visit.prescription?.followUpAt ?? null,
      items: (visit.prescription?.items ?? []).map((i) => ({
        medicationName: i.medicationName,
        dose: i.dose,
        route: i.route,
        frequency: i.frequency,
        duration: i.duration,
        instructions: i.instructions,
      })),
    },
    medicationsCreated,
    conflicts,
  };
}

export function listVisitsForPatient(patientId: string, opts?: { status?: VisitStatus }) {
  return prisma.visit.findMany({
    where: { patientId, status: opts?.status },
    orderBy: [{ signedAt: "desc" }, { startedAt: "desc" }],
    include: visitInclude,
  });
}
