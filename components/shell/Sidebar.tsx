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

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 sm:flex">
      <div className="mb-6 px-2 text-lg font-semibold text-slate-900">Meridian</div>
      <nav className="flex flex-col gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
