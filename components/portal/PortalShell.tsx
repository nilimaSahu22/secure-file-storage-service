"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Heart, Home, CalendarDays, FolderLock, MessageCircle, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/portal", label: "Home", icon: Home },
  { href: "/portal/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/portal/documents", label: "Documents", icon: FolderLock },
  { href: "/portal/chat", label: "Messages", icon: MessageCircle },
];

export function PortalShell({ patientName, children }: { patientName: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Heart size={18} className="text-blue-600" />
          Meridian
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">
            Hi, <span className="font-medium text-slate-900">{patientName}</span>
          </span>
          <button
            onClick={() => signOut({ redirectTo: "/portal/login" })}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </header>
      <nav className="flex gap-1 border-b border-slate-200 bg-white px-6">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                active ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
