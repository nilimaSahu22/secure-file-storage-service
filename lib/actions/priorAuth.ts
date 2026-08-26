"use server";

import { revalidatePath } from "next/cache";
import { PriorAuthStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { submitPriorAuth, updatePriorAuthStatus } from "@/lib/services/priorAuth";

export async function submitPriorAuthAction(patientId: string, serviceDescription: string) {
  const session = await auth();
  const record = await submitPriorAuth(patientId, serviceDescription);

  await logAudit({
    actorType: "staff",
    actorId: session?.user.id,
    actorName: session?.user.name ?? "Unknown staff",
    action: "priorauth.submitted",
    targetType: "PriorAuthorization",
    targetId: record.id,
    metadata: { patientId, serviceDescription },
  });

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
