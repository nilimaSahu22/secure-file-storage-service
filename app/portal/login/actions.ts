"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export interface PortalLoginState {
  error?: string;
}

export async function portalLoginAction(_prevState: PortalLoginState, formData: FormData): Promise<PortalLoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      portal: "patient",
      redirectTo: "/portal",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      if ((error as { code?: string }).code === "wrong_portal") {
        return { error: "This is a staff account. Please sign in through the staff login." };
      }
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}
