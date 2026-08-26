"use server";

import { revalidatePath } from "next/cache";
import type { Department } from "@prisma/client";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { upsertWorkflow, type TriageRule } from "@/lib/services/workflows";

export async function saveWorkflowAction(
  department: Department,
  intakeSteps: string[],
  triageRules: TriageRule[],
  escalationPath: string
) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  const record = await upsertWorkflow({ department, intakeSteps, triageRules, escalationPath });

  await logAudit({
    actorType: "staff",
    actorId: session.user.id,
    actorName: session.user.name ?? "Unknown staff",
    action: "workflow.edited",
    targetType: "DepartmentWorkflow",
    targetId: record.id,
    metadata: { department },
  });

  revalidatePath("/dashboard/admin/workflows");
  revalidatePath("/");

  return record;
}
