import { prisma } from "@/lib/prisma";
import { AlertSeverity } from "@prisma/client";
import { checkDrugAllergyConflicts } from "@/lib/clinical/rules";

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
