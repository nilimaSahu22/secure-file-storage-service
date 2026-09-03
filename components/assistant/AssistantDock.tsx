"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { AssistantView, type ThreadSummary } from "@/components/assistant/AssistantView";

interface AssistantDockProps {
  ownerType: "staff" | "patient";
}

const FULLSCREEN_PATH = { staff: "/dashboard/assistant", patient: "/portal/assistant" } as const;

export function AssistantDock({ ownerType }: AssistantDockProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/threads");
      if (!res.ok) return;
      setThreads(await res.json());
    } catch {
      setThreads([]);
    }
  }, []);

  function openDock() {
    setOpen(true);
    if (threads === null) void load();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // The full-screen Assistant and the in-chart Ask AI panel own their own surface.
  const onFullscreen = pathname?.startsWith(FULLSCREEN_PATH[ownerType]);
  const onChart = ownerType === "staff" && /^\/dashboard\/patients\/[^/]+$/.test(pathname ?? "");
  if (onFullscreen || onChart) return null;

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
            onClick={() => setOpen(false)}
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
                    onClick={() => setOpen(false)}
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
                ownerType={ownerType}
                variant="panel"
                initialThreads={threads}
                activeThreadId={null}
                initialMessages={[]}
                focusedPatient={null}
                onClose={() => setOpen(false)}
                onExpand={() => {
                  setOpen(false);
                  router.push(FULLSCREEN_PATH[ownerType]);
                }}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}
