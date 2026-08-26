import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";

export default async function PortalAppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session || session.user.type !== "patient") {
    redirect("/portal/login");
  }

  return <PortalShell patientName={session.user.name ?? "Patient"}>{children}</PortalShell>;
}
