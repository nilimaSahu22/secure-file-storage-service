"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";

export function Topbar({ name, role }: { name: string; role: Role }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="text-sm text-slate-500">
        Signed in as <span className="font-medium text-slate-900">{name}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
          {role.charAt(0) + role.slice(1).toLowerCase()}
        </span>
        <button
          onClick={() => signOut({ redirectTo: "/login" })}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </header>
  );
}
