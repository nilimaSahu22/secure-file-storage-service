"use server";

import { revalidatePath } from "next/cache";
import { resetDemoData } from "@/lib/services/admin";

export async function resetDemoDataAction() {
  await resetDemoData();
  revalidatePath("/dashboard");
}
