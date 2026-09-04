"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { AssistantView } from "@/components/assistant/AssistantView";
import { useAssistant } from "@/components/assistant/AssistantController";
import type { AssistantMessageView } from "@/lib/services/assistant";

interface AssistantDockProps {
  ownerType: "staff" | "patient";
  /** Left offset of the full-width panel (the width of any persistent app sidebar). */
  fullInsetClass?: string;
  /** The built-in Home/Chat rail (used by the patient portal, which has no app sidebar). */
  withRail?: boolean;
}

export function AssistantDock({
  ownerType,
  fullInsetClass = "min-[1201px]:w-[calc(100vw-210px)]",
  withRail = false,
}: AssistantDockProps) {
  const pathname = usePathname();
  const { open, full, threadId, seq, openDocked, setFull, toggleFull, close } = useAssistant();
  const [thread, setThread] = useState<{ messages: AssistantMessageView[]; title?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [chartPatient, setChartPatient] = useState<{ id: string; name: string } | null>(null);

  const chartId =
    ownerType === "staff" ? pathname?.match(/^\/dashboard\/patients\/([^/]+)$/)?.[1] ?? null : null;

  // Load a saved thread's messages when one is opened from the sidebar.
  const handledSeq = useRef(-1);
  const loadThread = useCallback((id: string | null) => {
    setThread(null);
    if (!id) return;
    setLoading(true);
    let stale = false;
    fetch(`/api/assistant/threads/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (stale) return;
        setThread(d ? { messages: d.messages ?? [], title: d.thread?.title } : { messages: [] });
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => {
      stale = true;
    };
  }, []);

  useEffect(() => {
    if (handledSeq.current === seq) return;
    handledSeq.current = seq;
    return loadThread(threadId);
  }, [threadId, seq, loadThread]);

  // Scope the assistant to the chart you're viewing.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- scope to the current chart
    setChartPatient(null);
    if (!chartId) return;
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

  // Open (docked) the first time you land on a given chart.
  const openedForChart = useRef<string | null>(null);
  useEffect(() => {
    if (chartId && openedForChart.current !== chartId) {
      openedForChart.current = chartId;
      openDocked();
    }
  }, [chartId, openDocked]);

  // Navigating to another page collapses a full panel back to the docked column.
  const prevPath = useRef(pathname);
  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      if (full) setFull(false);
    }
  }, [pathname, full, setFull]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || !open) return;
      if (full) setFull(false);
      else close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, full, close, setFull]);

  const widthClass = !open
    ? "min-[1201px]:w-0 min-[1201px]:border-l-0"
    : full
      ? fullInsetClass
      : "min-[1201px]:w-[400px] min-[1201px]:shadow-[-8px_0_24px_-12px_rgba(15,23,42,0.12)]";

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={openDocked}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#2f66ea] px-4 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:bg-[#2554c7] hover:-translate-y-0.5 active:translate-y-0"
        >
          <Sparkles size={16} /> Ask AI
        </button>
      )}

      {/* Scrim: only on narrow screens, where the panel is an overlay. */}
      <button
        aria-label="Close assistant"
        tabIndex={open ? 0 : -1}
        onClick={() => (full ? setFull(false) : close())}
        className={`fixed inset-0 z-[45] bg-slate-900/25 transition-opacity duration-300 min-[1201px]:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl transition-[width,transform] duration-300 ease-out min-[1201px]:inset-y-auto min-[1201px]:top-14 min-[1201px]:h-[calc(100dvh-3.5rem)] min-[1201px]:max-w-none min-[1201px]:shadow-none ${
          open ? "translate-x-0" : "translate-x-full min-[1201px]:translate-x-0"
        } ${widthClass}`}
      >
        {open && loading ? (
          <div className="flex flex-1 items-center justify-center text-slate-400">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : open ? (
          <AssistantView
            key={`${seq}:${threadId ?? chartPatient?.id ?? "new"}`}
            ownerType={ownerType}
            variant="panel"
            withRail={withRail}
            expanded={full}
            activeThreadId={threadId}
            initialMessages={thread?.messages ?? []}
            initialTitle={thread?.title}
            focusedPatient={chartPatient}
            onClose={close}
            onExpand={toggleFull}
          />
        ) : null}
      </aside>
    </>
  );
}
