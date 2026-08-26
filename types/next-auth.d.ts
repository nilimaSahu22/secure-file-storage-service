import type { Department, Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    type: "staff" | "patient";
    role?: Role;
    department?: Department | null;
  }

  interface Session {
    user: {
      id: string;
      type: "staff" | "patient";
      role?: Role;
      department?: Department | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    type?: "staff" | "patient";
    role?: Role;
    department?: Department | null;
  }
}
