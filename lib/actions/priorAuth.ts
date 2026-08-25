"use server";

import { revalidatePath } from "next/cache";
import { PriorAuthStatus } from "@prisma/client";
import { submitPriorAuth, updatePriorAuthStatus } from "@/lib/services/priorAuth";

export async function submitPriorAuthAction(patientId: string, serviceDescription: string) {
  const record = await submitPriorAuth(patientId, serviceDescription);
  revalidatePath(`/dashboard/patients/${patientId}`);
  return record;
}

export async function updatePriorAuthStatusAction(
  id: string,
  patientId: string,
  status: PriorAuthStatus
) {
  await updatePriorAuthStatus(id, status);
  revalidatePath(`/dashboard/patients/${patientId}`);
}
