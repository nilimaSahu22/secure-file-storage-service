import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/shell/DashboardShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session || session.user.type !== "staff" || !session.user.role) {
    redirect("/login");
  }

  return (
    <DashboardShell role={session.user.role} name={session.user.name ?? "Staff"}>
      {children}
    </DashboardShell>
  );
}
