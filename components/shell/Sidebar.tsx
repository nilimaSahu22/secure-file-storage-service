"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Users,
  CalendarDays,
  ListChecks,
  FileClock,
  // TrendingUp, // unused while the ROI Dashboard nav entry is commented out
  ShieldCheck,
  ScrollText,
  Workflow,
  BookOpen,
  Menu,
  X,
  LogOut,
  SquarePen,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { getInitialsFromName } from "@/lib/format";
import { ThreadList, HomeChatToggle, type ThreadSummary } from "@/components/assistant/ThreadList";
import { useAssistant } from "@/components/assistant/AssistantController";

export const THREADS_CHANGED_EVENT = "assistant:threads-changed";

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
  { href: "/dashboard/workflows", label: "Playbook", icon: BookOpen, roles: ["DOCTOR", "NURSE", "ADMIN"] },
  // Commented out for the demo — see 2026-08-31 note.
  // { href: "/dashboard/roi", label: "ROI Dashboard", icon: TrendingUp, roles: ["ADMIN", "DOCTOR"] },
  { href: "/dashboard/admin", label: "Admin", icon: ShieldCheck, roles: ["ADMIN"] },
  { href: "/dashboard/admin/audit-log", label: "Audit Log", icon: ScrollText, roles: ["ADMIN"] },
  { href: "/dashboard/admin/workflows", label: "Workflows", icon: Workflow, roles: ["ADMIN"] },
];

export function Sidebar({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const assistant = useAssistant();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<"home" | "chat">("home");
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);

  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const roleLabel = role.charAt(0) + role.slice(1).toLowerCase();
  const activeThreadId = assistant.open ? assistant.threadId : null;

  const refetchThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/threads");
      if (!res.ok) return;
      const data = await res.json();
      setThreads(Array.isArray(data) ? data : (data.threads ?? []));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const handler = () => void refetchThreads();
    handler();
    window.addEventListener(THREADS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(THREADS_CHANGED_EVENT, handler);
  }, [refetchThreads]);

  // Surface the conversation list whenever the assistant opens.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follow the assistant's open state
    if (assistant.open) setTab("chat");
  }, [assistant.open, assistant.seq]);

  function openThread(id: string) {
    setMenuOpen(false);
    assistant.openThread(id);
  }

  function newChat() {
    setMenuOpen(false);
    assistant.openNew();
  }

  async function patchThread(id: string, body: Record<string, unknown>) {
    setThreads((prev) =>
      body.archived
        ? (prev ?? []).filter((t) => t.id !== id)
        : (prev ?? []).map((t) => (t.id === id ? { ...t, title: String(body.title ?? t.title) } : t))
    );
    await fetch(`/api/assistant/threads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (body.archived && id === activeThreadId) assistant.openNew();
  }

  function navLink({ href, label, icon: Icon }: NavItem) {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setMenuOpen(false)}
        className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        <Icon size={16} />
        {label}
      </Link>
    );
  }

  const panel = (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <button
        onClick={newChat}
        className="flex w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <SquarePen size={15} /> New chat
      </button>
      <HomeChatToggle value={tab} onChange={setTab} />
      {tab === "home" ? (
        <nav className="flex flex-col gap-1 overflow-y-auto">{items.map(navLink)}</nav>
      ) : (
        <ThreadList
          threads={threads}
          activeId={activeThreadId}
          showNewChat={false}
          onOpen={openThread}
          onNewChat={newChat}
          onRename={(id, title) => patchThread(id, { title })}
          onArchive={(id) => patchThread(id, { archived: true })}
        />
      )}
    </div>
  );

  return (
    <>
      <aside className="flex w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 min-[1201px]:sticky min-[1201px]:top-0 min-[1201px]:h-screen min-[1201px]:w-[210px] min-[1201px]:flex-col min-[1201px]:items-stretch min-[1201px]:justify-start min-[1201px]:gap-0 min-[1201px]:border-b-0 min-[1201px]:border-r min-[1201px]:p-4">
        <div className="shrink-0 text-lg font-semibold text-slate-900 min-[1201px]:mb-4 min-[1201px]:px-2">
          Meridian
        </div>

        {/* Mobile/tablet: hamburger trigger only — nav, chat, and logout all live in the drawer. */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 min-[1201px]:hidden"
        >
          <Menu size={20} />
        </button>

        {/* Desktop: Home / Chat panel. */}
        <div className="hidden min-h-0 flex-1 min-[1201px]:flex min-[1201px]:flex-col">{panel}</div>

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

      {/* Mobile/tablet drawer. */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-slate-900/40 min-[1201px]:hidden"
        />
      )}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out min-[1201px]:hidden ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <span className="text-sm font-semibold text-slate-900">Menu</span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-3">{panel}</div>

        <div className="flex items-center gap-2 border-t border-slate-100 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
            {getInitialsFromName(name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{name}</p>
            <p className="text-xs text-slate-500">{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ redirectTo: "/login" })}
            aria-label="Log out"
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
