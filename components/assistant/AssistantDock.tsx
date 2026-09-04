"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AssistantView } from "@/components/assistant/AssistantView";
import type { AssistantMessageView } from "@/lib/services/assistant";

interface AssistantDockProps {
  ownerType: "staff" | "patient";
}

const RESUME_KEY = "assistant:resume";
const FULLSCREEN_PATH = { staff: "/dashboard/assistant", patient: "/portal/assistant" } as const;
const ANIM_MS = 280;

export function AssistantDock({ ownerType }: AssistantDockProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [resume, setResume] = useState<{ threadId: string; messages: AssistantMessageView[]; title?: string } | null>(
    null
  );
  const [chartPatient, setChartPatient] = useState<{ id: string; name: string } | null>(null);

  const onFullscreen = pathname?.startsWith(FULLSCREEN_PATH[ownerType]) ?? false;
  const chartId =
    ownerType === "staff" ? pathname?.match(/^\/dashboard\/patients\/([^/]+)$/)?.[1] ?? null : null;

  // Scope the assistant to the chart you're looking at.
  useEffect(() => {
    if (!chartId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale focus when leaving a chart
      setChartPatient(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/assistant/patients?id=${chartId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.patient) setChartPatient(d.patient);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [chartId]);

  const doClose = useCallback(() => {
    setExpanding(false);
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      setOpen(false);
      setResume(null);
    }, ANIM_MS);
  }, []);

  function openFresh() {
    setResume(null);
    setExpanding(false);
    setClosing(false);
    setOpen(true);
  }

  function expand(threadId: string | null) {
    // Cross-fade to the full-screen route: navigate now, fade the panel out over it. The
    // panel stays mounted until the route change unmounts the dock — no empty flash.
    setExpanding(true);
    router.push(
      threadId ? `${FULLSCREEN_PATH[ownerType]}?thread=${threadId}` : FULLSCREEN_PATH[ownerType]
    );
  }

  // Reset once the full-screen route has taken over (also covers navigating back).
  useEffect(() => {
    if (!onFullscreen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the route now owns the surface
    setOpen(false);
    setClosing(false);
    setExpanding(false);
    setResume(null);
  }, [onFullscreen]);

  const beginResume = useCallback((rid: string) => {
    setClosing(false);
    setExpanding(false);
    setResume(null);
    setOpen(true);
    if (rid === "new") return;
    void (async () => {
      try {
        const res = await fetch(`/api/assistant/threads/${rid}`);
        if (!res.ok) return;
        const data = await res.json();
        setResume({ threadId: rid, messages: data.messages ?? [], title: data.thread?.title });
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Coming back from the full-screen Assistant via a Home link: pick the conversation up here.
  useEffect(() => {
    if (onFullscreen) return;
    let rid: string | null = null;
    try {
      rid = sessionStorage.getItem(RESUME_KEY);
      if (rid) sessionStorage.removeItem(RESUME_KEY);
    } catch {
      rid = null;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to a navigation handoff, one-shot
    if (rid) beginResume(rid);
  }, [pathname, onFullscreen, beginResume]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") doClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, doClose]);

  if (onFullscreen) return null;

  const visible = open || closing;

  if (!visible) {
    return (
      <button
        type="button"
        onClick={openFresh}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#2f66ea] px-4 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:bg-[#2554c7] hover:-translate-y-0.5 active:translate-y-0"
      >
        <Sparkles size={16} /> Ask AI
      </button>
    );
  }

  return (
    <>
      <button
        aria-label="Close assistant"
        onClick={doClose}
        className={`fixed inset-0 z-40 bg-slate-900/20 transition-opacity duration-300 min-[1201px]:hidden ${
          closing ? "opacity-0" : "opacity-100"
        }`}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl animate-[slide-in-right_280ms_ease-out] transition-[transform,width,opacity] duration-[280ms] ease-out min-[1201px]:sticky min-[1201px]:inset-y-auto min-[1201px]:top-0 min-[1201px]:z-auto min-[1201px]:h-screen min-[1201px]:w-[400px] min-[1201px]:shrink-0 min-[1201px]:self-start min-[1201px]:shadow-none ${
          closing
            ? "translate-x-full opacity-0 min-[1201px]:w-0 min-[1201px]:translate-x-0 min-[1201px]:border-l-0"
            : "translate-x-0"
        } ${expanding ? "opacity-0" : ""}`}
      >
        <AssistantView
          key={resume?.threadId ?? chartPatient?.id ?? "new"}
          ownerType={ownerType}
          variant="panel"
          activeThreadId={resume?.threadId ?? null}
          initialMessages={resume?.messages ?? []}
          initialTitle={resume?.title}
          focusedPatient={chartPatient}
          onClose={doClose}
          onExpand={expand}
        />
      </aside>
    </>
  );
}
