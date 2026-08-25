"use server";

import { revalidatePath } from "next/cache";
import { addVital } from "@/lib/services/vitals";

export async function addVitalAction(patientId: string, type: string, value: string) {
  const vital = await addVital({ patientId, type, value });
  revalidatePath(`/dashboard/patients/${patientId}`);
  return { isAbnormal: vital.isAbnormal };
}
