"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      portal: "staff",
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      if ((error as { code?: string }).code === "wrong_portal") {
        return { error: "This is a patient account. Please sign in through the patient portal." };
      }
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}
