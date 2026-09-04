"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import {
  AssistantView,
  type ThreadSummary,
} from "@/components/assistant/AssistantView";
import type { AssistantMessageView } from "@/lib/services/assistant";

interface AssistantDockProps {
  ownerType: "staff" | "patient";
}

const RESUME_KEY = "assistant:resume";
const FULLSCREEN_PATH = { staff: "/dashboard/assistant", patient: "/portal/assistant" } as const;

export function AssistantDock({ ownerType }: AssistantDockProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
  const [resume, setResume] = useState<{ threadId: string; messages: AssistantMessageView[] } | null>(null);

  const onFullscreen = pathname?.startsWith(FULLSCREEN_PATH[ownerType]) ?? false;
  const onChart = ownerType === "staff" && /^\/dashboard\/patients\/[^/]+$/.test(pathname ?? "");
  const hidden = onFullscreen || onChart;

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/threads");
      if (res.ok) setThreads(await res.json());
      else setThreads([]);
    } catch {
      setThreads([]);
    }
  }, []);

  function openDock() {
    setOpen(true);
    setResume(null);
    if (threads === null) void loadThreads();
  }

  function closeDock() {
    setOpen(false);
    setResume(null);
  }

  // Coming back from the full-screen Assistant via its Home rail: pick the conversation up here.
  useEffect(() => {
    if (hidden) return;
    let rid: string | null = null;
    try {
      rid = sessionStorage.getItem(RESUME_KEY);
    } catch {
      rid = null;
    }
    if (!rid) return;
    try {
      sessionStorage.removeItem(RESUME_KEY);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
    if (threads === null) void loadThreads();
    void (async () => {
      try {
        const res = await fetch(`/api/assistant/threads/${rid}`);
        if (!res.ok) return;
        const data = await res.json();
        setResume({ threadId: rid as string, messages: data.messages ?? [] });
      } catch {
        /* ignore */
      }
    })();
  }, [pathname, hidden, threads, loadThreads]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (hidden) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={openDock}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#2f66ea] px-4 py-3 text-sm font-medium text-white shadow-lg transition-colors hover:bg-[#2554c7]"
        >
          <Sparkles size={16} /> Ask AI
        </button>
      )}

      {open && (
        <>
          <button
            aria-label="Close assistant"
            onClick={closeDock}
            className="fixed inset-0 z-40 bg-slate-900/20 md:hidden"
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] animate-[slide-in-right_240ms_ease-out] flex-col border-l border-slate-200 bg-white shadow-2xl">
            {threads === null ? (
              <div className="flex flex-1 flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    <Sparkles size={15} className="text-[#2f66ea]" /> Ask AI
                  </span>
                  <button
                    onClick={closeDock}
                    aria-label="Close assistant"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Loading…</div>
              </div>
            ) : (
              <AssistantView
                key={resume?.threadId ?? "new"}
                ownerType={ownerType}
                variant="panel"
                initialThreads={threads}
                activeThreadId={resume?.threadId ?? null}
                initialMessages={resume?.messages ?? []}
                focusedPatient={null}
                onClose={closeDock}
                onExpand={(threadId) => {
                  closeDock();
                  router.push(
                    threadId ? `${FULLSCREEN_PATH[ownerType]}?thread=${threadId}` : FULLSCREEN_PATH[ownerType]
                  );
                }}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}
