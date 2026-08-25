import type { ReactNode } from "react";
import { RequireSession } from "@/lib/auth/RequireSession";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireSession>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </RequireSession>
  );
}
