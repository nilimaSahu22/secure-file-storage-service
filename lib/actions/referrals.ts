"use server";

import { revalidatePath } from "next/cache";
import { createReferral, type CreateReferralInput } from "@/lib/services/referrals";

export async function createReferralAction(input: CreateReferralInput) {
  const referral = await createReferral(input);
  revalidatePath(`/dashboard/patients/${input.patientId}`);
  return referral;
}
