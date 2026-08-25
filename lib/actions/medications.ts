"use server";

import { revalidatePath } from "next/cache";
import { addMedicationWithConflictCheck } from "@/lib/services/medications";

export async function addMedicationAction(
  patientId: string,
  data: { name: string; dosage: string; frequency: string }
) {
  const result = await addMedicationWithConflictCheck({ patientId, ...data });
  revalidatePath(`/dashboard/patients/${patientId}`);
  return { conflictCount: result.alerts.length };
}
