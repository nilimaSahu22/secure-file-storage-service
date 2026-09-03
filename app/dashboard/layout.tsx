import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { AssistantDock } from "@/components/assistant/AssistantDock";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session || session.user.type !== "staff" || !session.user.role) {
    redirect("/login");
  }

  const name = session.user.name ?? "Staff";

  return (
    <div className="flex min-h-screen flex-col min-[1201px]:flex-row">
      <Sidebar role={session.user.role} name={name} />
      <div className="flex flex-1 flex-col">
        <Topbar name={name} role={session.user.role} />
        <main className="flex-1">{children}</main>
      </div>
      <AssistantDock ownerType="staff" />
    </div>
  );
}
