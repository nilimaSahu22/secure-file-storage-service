"use client";

import { useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import type { ChatMessage as PrismaChatMessage, MedicalFile } from "@prisma/client";
import { AiChatPanel } from "@/components/chart/AiChatPanel";

interface ChartShellProps {
  patientId: string;
  patientName: string;
  initialMessages: PrismaChatMessage[];
  files: Pick<MedicalFile, "id" | "fileName">[];
  children: ReactNode;
}

const DESKTOP_QUERY = "(min-width: 1201px)";
const DESKTOP_CLOSE_ANIMATION_MS = 300;

export function ChartShell({ patientId, patientName, initialMessages, files, children }: ChartShellProps) {
  const [aiOpen, setAiOpen] = useState(true);
  // Only used on the desktop dock, to hold the panel mounted long enough for the
  // slide-out animation to finish before it's actually removed. Mobile/tablet never
  // sets this — its close path is untouched (instant unmount, same as before).
  const [closing, setClosing] = useState(false);

  function handleClose() {
    const isDesktop = typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches;
    if (isDesktop) {
      setClosing(true);
      window.setTimeout(() => {
        setAiOpen(false);
        setClosing(false);
      }, DESKTOP_CLOSE_ANIMATION_MS);
    } else {
      setAiOpen(false);
    }
  }

  const showPanel = aiOpen || closing;

  return (
    <div className="flex flex-col gap-6 min-[1201px]:flex-row min-[1201px]:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>

      {/*
        Mobile/tablet (below 1201px) is untouched: a small floating popup that
        mounts/unmounts instantly (pop-in on open, no lingering element on close —
        an earlier "always mounted, animate geometry" version left an invisible box
        behind that swallowed clicks meant for the reopen button).
        At 1201px+ it's the sticky right-hand dock, now sliding in/out from the
        right edge (Cursor/Copilot-style) via the `closing` delay above, so the
        slide-out animation has time to actually play before it unmounts.
      */}
      {showPanel && (
        <div
          className={`animate-[pop-in_180ms_ease-out] fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] max-w-[360px] min-[1201px]:sticky min-[1201px]:top-6 min-[1201px]:right-auto min-[1201px]:bottom-auto min-[1201px]:z-auto min-[1201px]:w-[380px] min-[1201px]:max-w-none min-[1201px]:shrink-0 ${
            closing
              ? "min-[1201px]:animate-[slide-out-right_300ms_ease-in]"
              : "min-[1201px]:animate-[slide-in-right_300ms_ease-out]"
          }`}
        >
          <AiChatPanel
            patientId={patientId}
            patientName={patientName}
            initialMessages={initialMessages}
            files={files}
            variant="sidebar"
            onClose={handleClose}
          />
        </div>
      )}

      {!aiOpen && !closing && (
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#2f66ea] px-4 py-3 text-sm font-medium text-white shadow-lg transition-colors hover:bg-[#2554c7]"
        >
          <Sparkles size={16} />
          Ask AI
        </button>
      )}
    </div>
  );
}
