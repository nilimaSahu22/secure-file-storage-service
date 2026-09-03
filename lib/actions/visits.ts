"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { S3NotConfiguredError } from "@/lib/env";
import { renderPrescriptionPdf } from "@/lib/pdf/render";
import { uploadServerObject } from "@/lib/services/files";
import {
  updateDraftVisit,
  signVisit,
  VisitLockedError,
  type UpdateDraftVisitInput,
} from "@/lib/services/visits";
import { generateFollowUpsForVisit } from "@/lib/services/followUps";

async function requireStaff() {
  const session = await auth();
  if (!session || session.user.type !== "staff") throw new Error("Forbidden");
  return session;
}

export async function saveVisitDraftAction(visitId: string, input: UpdateDraftVisitInput) {
  const session = await requireStaff();
  try {
    const { patientId } = await updateDraftVisit(visitId, input);
    await logAudit({
      actorType: "staff",
      actorId: session.user.id,
      actorName: session.user.name ?? "Unknown staff",
      action: "visit.draft_saved",
      targetType: "Visit",
      targetId: visitId,
    });
    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath(`/dashboard/patients/${patientId}/visit/${visitId}/review`);
    return { ok: true as const };
  } catch (err) {
    if (err instanceof VisitLockedError) return { ok: false as const, error: "locked" };
    throw err;
  }
}

export async function signVisitAction(visitId: string, input: UpdateDraftVisitInput) {
  const session = await requireStaff();
  const signerName = session.user.name ?? "Attending clinician";

  try {
    await updateDraftVisit(visitId, input);
  } catch (err) {
    if (err instanceof VisitLockedError) return { ok: false as const, error: "locked" };
    throw err;
  }

  const result = await signVisit(visitId, session.user.id, signerName);

  // Render and store the prescription PDF — best-effort; the visit is already signed.
  try {
    const v = result.visit;
    const pdf = await renderPrescriptionPdf({
      patientName: `${v.patient.firstName} ${v.patient.lastName}`,
      patientDob: format(v.patient.dateOfBirth, "MMM d, yyyy"),
      providerName: v.author?.name ?? signerName,
      visitDate: format(v.signedAt ?? new Date(), "MMM d, yyyy"),
      items: result.prescription.items.map((i) => ({
        medicationName: i.medicationName,
        dose: i.dose,
        route: i.route,
        frequency: i.frequency,
        duration: i.duration,
        instructions: i.instructions,
      })),
      investigations: result.prescription.investigations,
      advice: result.prescription.advice,
      followUpDate: result.prescription.followUpAt ? format(result.prescription.followUpAt, "MMM d, yyyy") : null,
      signatureStatement: v.signatureStatement ?? "",
      copyLabel: "Prescription",
    });
    const key = `prescriptions/${visitId}.pdf`;
    await uploadServerObject({ key, body: pdf, contentType: "application/pdf" });
    await prisma.visit.update({ where: { id: visitId }, data: { prescriptionPdfKey: key } });
  } catch (err) {
    if (!(err instanceof S3NotConfiguredError)) {
      console.error("Prescription PDF generation failed:", err);
    }
  }

  try {
    await generateFollowUpsForVisit(visitId);
  } catch (err) {
    console.error("Follow-up generation failed:", err);
  }

  await logAudit({
    actorType: "staff",
    actorId: session.user.id,
    actorName: signerName,
    action: "visit.signed",
    targetType: "Visit",
    targetId: visitId,
    metadata: {
      noteId: result.noteId,
      prescriptionId: result.prescription.id,
      medicationsCreated: result.medicationsCreated,
      conflicts: result.conflicts.length,
    },
  });

  revalidatePath(`/dashboard/patients/${result.patientId}`);
  revalidatePath("/portal/visits");
  revalidatePath("/portal");

  return { ok: true as const, patientId: result.patientId, conflicts: result.conflicts };
}
