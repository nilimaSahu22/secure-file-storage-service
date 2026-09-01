import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import type { Department, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// Thrown when a patient signs in through the staff login (or vice versa) so the
// login page can point them at the right entrance instead of a generic failure.
export class WrongPortalError extends CredentialsSignin {
  code = "wrong_portal";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal", type: "text" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        const portal = credentials?.portal as "staff" | "patient" | undefined;
        if (!email || !password) return null;

        const staff = await prisma.staffUser.findUnique({ where: { email } });
        if (staff) {
          const valid = await bcrypt.compare(password, staff.passwordHash);
          if (valid && portal === "patient") throw new WrongPortalError();
          await logAudit({
            actorType: "staff",
            actorId: staff.id,
            actorName: staff.name,
            action: valid ? "login.success" : "login.failure",
          });
          if (!valid) return null;
          return {
            id: staff.id,
            name: staff.name,
            email: staff.email,
            type: "staff",
            role: staff.role,
            department: staff.department,
          };
        }

        const patient = await prisma.patient.findUnique({ where: { portalEmail: email } });
        if (patient?.portalPasswordHash) {
          const valid = await bcrypt.compare(password, patient.portalPasswordHash);
          if (valid && portal === "staff") throw new WrongPortalError();
          await logAudit({
            actorType: "patient",
            actorId: patient.id,
            actorName: `${patient.firstName} ${patient.lastName}`,
            action: valid ? "login.success" : "login.failure",
          });
          if (!valid) return null;
          return {
            id: patient.id,
            name: `${patient.firstName} ${patient.lastName}`,
            email: patient.portalEmail,
            type: "patient",
          };
        }

        await logAudit({
          actorType: "system",
          actorName: "unknown",
          action: "login.failure",
          metadata: { attemptedEmail: email },
        });
        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.type = user.type;
        token.role = user.role;
        token.department = user.department;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.type = token.type as "staff" | "patient";
      session.user.role = token.role as Role | undefined;
      session.user.department = token.department as Department | null | undefined;
      return session;
    },
  },
});
