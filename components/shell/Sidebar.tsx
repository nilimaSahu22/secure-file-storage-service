"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  CalendarDays,
  ListChecks,
  FileClock,
  TrendingUp,
  ShieldCheck,
  ScrollText,
  Workflow,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { getInitialsFromName } from "@/lib/format";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Users;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Patients", icon: Users, roles: ["DOCTOR", "NURSE", "ADMIN"] },
  { href: "/dashboard/appointments", label: "Appointments", icon: CalendarDays, roles: ["DOCTOR", "NURSE", "ADMIN"] },
  { href: "/dashboard/tasks", label: "Task Queue", icon: ListChecks, roles: ["DOCTOR", "NURSE", "ADMIN"] },
  { href: "/dashboard/prior-auth", label: "Prior Auth", icon: FileClock, roles: ["DOCTOR", "NURSE", "ADMIN"] },
  { href: "/dashboard/roi", label: "ROI Dashboard", icon: TrendingUp, roles: ["ADMIN", "DOCTOR"] },
  { href: "/dashboard/admin", label: "Admin", icon: ShieldCheck, roles: ["ADMIN"] },
  { href: "/dashboard/admin/audit-log", label: "Audit Log", icon: ScrollText, roles: ["ADMIN"] },
  { href: "/dashboard/admin/workflows", label: "Workflows", icon: Workflow, roles: ["ADMIN"] },
];

export function Sidebar({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const roleLabel = role.charAt(0) + role.slice(1).toLowerCase();

  return (
    <aside className="flex w-full shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 py-2 min-[1201px]:sticky min-[1201px]:top-0 min-[1201px]:h-screen min-[1201px]:w-[190px] min-[1201px]:flex-col min-[1201px]:items-stretch min-[1201px]:gap-0 min-[1201px]:border-b-0 min-[1201px]:border-r min-[1201px]:p-4">
      <div className="shrink-0 text-lg font-semibold text-slate-900 min-[1201px]:mb-6 min-[1201px]:px-2">
        Meridian
      </div>

      <nav className="flex gap-1 overflow-x-auto min-[1201px]:flex-col min-[1201px]:overflow-visible">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Fills remaining sidebar height so the profile footer sits pinned at the bottom (desktop only). */}
      <div className="hidden min-[1201px]:block min-[1201px]:flex-1" />

      <div className="hidden shrink-0 items-center gap-2 border-t border-slate-100 pt-4 min-[1201px]:flex">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
          {getInitialsFromName(name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </div>
      </div>
    </aside>
  );
}
