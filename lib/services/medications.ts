import { prisma } from "@/lib/prisma";
import { AlertSeverity, MedicationStatus, type Prisma } from "@prisma/client";
import { checkDrugAllergyConflicts, type DrugAllergyConflict } from "@/lib/clinical/rules";

export interface AddMedicationInput {
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
}

export async function addMedicationWithConflictCheck(input: AddMedicationInput) {
  const allergies = await prisma.allergy.findMany({ where: { patientId: input.patientId } });
  const conflicts = checkDrugAllergyConflicts(input.name, allergies);

  const medication = await prisma.medication.create({
    data: {
      patientId: input.patientId,
      name: input.name,
      dosage: input.dosage,
      frequency: input.frequency,
    },
  });

  const alerts = [];
  for (const conflict of conflicts) {
    const alert = await prisma.clinicalAlert.create({
      data: {
        patientId: input.patientId,
        type: "DRUG_ALLERGY_CONFLICT",
        message: `${input.name} may conflict with documented allergy to ${conflict.allergen}: ${conflict.description}`,
        severity: AlertSeverity.HIGH,
      },
    });
    alerts.push(alert);
  }

  return { medication, alerts };
}

export interface PrescriptionItemForMedication {
  medicationName: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string | null;
}

/**
 * Turns a signed prescription item into an active Medication row and raises a HIGH
 * clinical alert per drug-allergy conflict. Runs inside the sign transaction.
 */
export async function createMedicationFromPrescriptionItem(
  tx: Prisma.TransactionClient,
  input: {
    patientId: string;
    visitId: string;
    prescribedById: string;
    item: PrescriptionItemForMedication;
  }
): Promise<{ medicationId: string; conflicts: DrugAllergyConflict[] }> {
  const allergies = await tx.allergy.findMany({ where: { patientId: input.patientId } });
  const conflicts = checkDrugAllergyConflicts(input.item.medicationName, allergies);

  const medication = await tx.medication.create({
    data: {
      patientId: input.patientId,
      name: input.item.medicationName,
      dosage: input.item.dose,
      frequency: input.item.frequency,
      route: input.item.route || null,
      duration: input.item.duration,
      status: MedicationStatus.ACTIVE,
      visitId: input.visitId,
      prescribedById: input.prescribedById,
    },
  });

  for (const conflict of conflicts) {
    await tx.clinicalAlert.create({
      data: {
        patientId: input.patientId,
        type: "DRUG_ALLERGY_CONFLICT",
        message: `${input.item.medicationName} may conflict with documented allergy to ${conflict.allergen}: ${conflict.description}`,
        severity: AlertSeverity.HIGH,
      },
    });
  }

  return { medicationId: medication.id, conflicts };
}
