"use client";

import type { ReactNode } from "react";
import type { Role } from "@prisma/client";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { AssistantDock } from "@/components/assistant/AssistantDock";
import { AssistantProvider, useAssistant } from "@/components/assistant/AssistantController";

function Chrome({ role, name, children }: { role: Role; name: string; children: ReactNode }) {
  const { open, full } = useAssistant();
  return (
    <div className="flex min-h-screen flex-col min-[1201px]:flex-row">
      <Sidebar role={role} name={name} />
      <div
        className={`flex min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-out ${
          open && !full ? "min-[1201px]:pr-[400px]" : "min-[1201px]:pr-0"
        }`}
      >
        <Topbar name={name} role={role} />
        <main className="flex-1">{children}</main>
      </div>
      <AssistantDock ownerType="staff" />
    </div>
  );
}

export function DashboardShell({ role, name, children }: { role: Role; name: string; children: ReactNode }) {
  return (
    <AssistantProvider>
      <Chrome role={role} name={name}>
        {children}
      </Chrome>
    </AssistantProvider>
  );
}
