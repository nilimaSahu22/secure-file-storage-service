"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AssistantView } from "@/components/assistant/AssistantView";
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
  const [resume, setResume] = useState<{ threadId: string; messages: AssistantMessageView[]; title?: string } | null>(
    null
  );

  const onFullscreen = pathname?.startsWith(FULLSCREEN_PATH[ownerType]) ?? false;
  const onChart = ownerType === "staff" && /^\/dashboard\/patients\/[^/]+$/.test(pathname ?? "");
  const hidden = onFullscreen || onChart;

  function close() {
    setOpen(false);
    setResume(null);
  }

  // Coming back from the full-screen Assistant via a Home link: pick the conversation up here.
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
    void (async () => {
      try {
        const res = await fetch(`/api/assistant/threads/${rid}`);
        if (!res.ok) return;
        const data = await res.json();
        setResume({ threadId: rid as string, messages: data.messages ?? [], title: data.thread?.title });
      } catch {
        /* ignore */
      }
    })();
  }, [pathname, hidden]);

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
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#2f66ea] px-4 py-3 text-sm font-medium text-white shadow-lg transition-colors hover:bg-[#2554c7]"
        >
          <Sparkles size={16} /> Ask AI
        </button>
      )}

      {open && (
        <>
          <button
            aria-label="Close assistant"
            onClick={close}
            className="fixed inset-0 z-40 bg-slate-900/20 md:hidden"
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] animate-[slide-in-right_240ms_ease-out] flex-col border-l border-slate-200 bg-white shadow-2xl">
            <AssistantView
              key={resume?.threadId ?? "new"}
              ownerType={ownerType}
              variant="panel"
              activeThreadId={resume?.threadId ?? null}
              initialMessages={resume?.messages ?? []}
              initialTitle={resume?.title}
              focusedPatient={null}
              onClose={close}
              onExpand={(threadId) => {
                close();
                router.push(
                  threadId ? `${FULLSCREEN_PATH[ownerType]}?thread=${threadId}` : FULLSCREEN_PATH[ownerType]
                );
              }}
            />
          </div>
        </>
      )}
    </>
  );
}
