"use server";

import { revalidatePath } from "next/cache";
import { TaskStatus } from "@prisma/client";
import { updateTaskStatus } from "@/lib/services/tasks";

export async function updateTaskStatusAction(taskId: string, patientId: string, status: TaskStatus) {
  await updateTaskStatus(taskId, status);
  revalidatePath(`/dashboard/patients/${patientId}`);
  revalidatePath("/dashboard/tasks");
}
