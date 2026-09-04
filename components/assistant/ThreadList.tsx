"use client";

import { useState } from "react";
import { SquarePen, MessageSquare, Pencil, Archive, Home } from "lucide-react";

export interface ThreadSummary {
  id: string;
  title: string;
  focusedPatientId: string | null;
  archived: boolean;
  updatedAt: string | Date;
}

const DEFAULT_TITLE_LABELS = new Set(["New conversation", "New chat"]);

export function displayTitle(title: string): string {
  return DEFAULT_TITLE_LABELS.has(title) ? "New chat" : title;
}

export function relativeTime(value: string | Date): string {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

export function groupThreads(threads: ThreadSummary[]): { label: string; items: ThreadSummary[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86_400_000;
  const buckets: Record<string, ThreadSummary[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 days": [],
    Older: [],
  };
  for (const t of threads) {
    const ts = new Date(t.updatedAt).getTime();
    if (ts >= startOfToday) buckets.Today.push(t);
    else if (ts >= startOfToday - day) buckets.Yesterday.push(t);
    else if (ts >= startOfToday - 7 * day) buckets["Previous 7 days"].push(t);
    else buckets.Older.push(t);
  }
  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

interface ThreadListProps {
  threads: ThreadSummary[] | null;
  activeId: string | null;
  onOpen: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onArchive: (id: string) => void;
}

export function ThreadList({ threads, activeId, onOpen, onNewChat, onRename, onArchive }: ThreadListProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function commit(id: string) {
    const v = renameValue.trim();
    setRenamingId(null);
    if (v) onRename(id, v);
  }

  const groups = threads ? groupThreads(threads) : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button
        onClick={onNewChat}
        className="mb-1 flex w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <SquarePen size={15} /> New chat
      </button>
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {threads === null && <p className="px-2 py-3 text-xs text-slate-400">Loading…</p>}
        {threads !== null && groups.length === 0 && (
          <p className="px-2 py-3 text-xs text-slate-400">No conversations yet.</p>
        )}
        {groups.map((group) => (
          <div key={group.label} className="mb-2">
            <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {group.label}
            </p>
            {group.items.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${
                  t.id === activeId ? "bg-white shadow-sm ring-1 ring-slate-200/60" : "hover:bg-slate-100"
                }`}
              >
                {renamingId === t.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => commit(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commit(t.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="min-w-0 flex-1 rounded border border-slate-300 px-1.5 py-0.5 text-xs outline-none"
                  />
                ) : (
                  <>
                    <button
                      onClick={() => onOpen(t.id)}
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-slate-700"
                      title={displayTitle(t.title)}
                    >
                      <MessageSquare size={13} className="shrink-0 text-slate-400" />
                      <span className="truncate">{displayTitle(t.title)}</span>
                    </button>
                    <span className="shrink-0 text-[11px] text-slate-400 group-hover:hidden">
                      {relativeTime(t.updatedAt)}
                    </span>
                    <button
                      onClick={() => {
                        setRenamingId(t.id);
                        setRenameValue(displayTitle(t.title));
                      }}
                      aria-label="Rename"
                      className="hidden h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-600 group-hover:flex"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => onArchive(t.id)}
                      aria-label="Archive"
                      className="hidden h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-600 group-hover:flex"
                    >
                      <Archive size={12} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface HomeChatToggleProps {
  value: "home" | "chat";
  onChange: (v: "home" | "chat") => void;
}

export function HomeChatToggle({ value, onChange }: HomeChatToggleProps) {
  return (
    <div className="flex rounded-lg bg-slate-100 p-0.5 text-sm">
      {(["home", "chat"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 capitalize ${
            value === tab ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {tab === "home" ? <Home size={13} /> : <MessageSquare size={13} />}
          {tab}
        </button>
      ))}
    </div>
  );
}
