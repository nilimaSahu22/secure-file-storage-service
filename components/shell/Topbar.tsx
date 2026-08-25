"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useSession } from "@/lib/auth/SessionProvider";
import type { SessionRole } from "@/lib/auth/session";
import { Select } from "@/components/ui/Select";

const ROLE_OPTIONS: SessionRole[] = ["DOCTOR", "NURSE", "ADMIN"];

export function Topbar() {
  const { session, setRole, logout } = useSession();
  const router = useRouter();

  function onLogout() {
    logout();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="text-sm text-slate-500">
        Signed in as <span className="font-medium text-slate-900">{session?.name}</span>
      </div>
      <div className="flex items-center gap-4">
        <Select
          id="role-switcher"
          value={session?.role ?? "DOCTOR"}
          onChange={(e) => setRole(e.target.value as SessionRole)}
          className="w-36"
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {role.charAt(0) + role.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </header>
  );
}
