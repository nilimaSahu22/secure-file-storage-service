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
    <aside className="flex w-full shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 py-2 min-[901px]:h-screen min-[901px]:w-60 min-[901px]:flex-col min-[901px]:items-stretch min-[901px]:gap-0 min-[901px]:border-b-0 min-[901px]:border-r min-[901px]:p-4">
      <div className="shrink-0 text-lg font-semibold text-slate-900 min-[901px]:mb-6 min-[901px]:px-2">
        Meridian
      </div>
      <nav className="flex gap-1 overflow-x-auto min-[901px]:flex-col min-[901px]:overflow-visible">
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
    </aside>
  );
}
