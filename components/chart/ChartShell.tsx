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

export function ChartShell({ patientId, patientName, initialMessages, files, children }: ChartShellProps) {
  const [aiOpen, setAiOpen] = useState(true);

  return (
    <div className="flex flex-col gap-6 min-[1201px]:flex-row min-[1201px]:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>

      {/* Backdrop — only for the mobile/tablet bottom sheet; the desktop dock has no modal overlay. */}
      {aiOpen && (
        <div
          onClick={() => setAiOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-slate-900/40 min-[1201px]:hidden"
        />
      )}

      {/*
        Below 1201px: a fixed bottom sheet that slides up from the screen edge —
        avoids burying "Ask AI" at the end of a long scroll on mobile/tablet.
        At 1201px+: the sticky right-hand dock, unchanged — slides in from the right
        and collapses width so the left column reflows into the freed space.
        Stays mounted at all times so the transform transition has a "from" state
        to animate out of; purely structural (no bg/border/rounding of its own —
        AiChatPanel's own card supplies that) to avoid a double-card look.
      */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 overflow-hidden min-[1201px]:static min-[1201px]:inset-auto min-[1201px]:z-auto min-[1201px]:sticky min-[1201px]:top-6 min-[1201px]:shrink-0 transition-[width] duration-300 ease-in-out ${
          aiOpen ? "min-[1201px]:w-[380px]" : "min-[1201px]:w-0"
        }`}
      >
        <div
          className={`w-full transition-transform duration-300 ease-in-out min-[1201px]:w-[380px] ${
            aiOpen
              ? "translate-y-0 min-[1201px]:translate-x-0"
              : "translate-y-full min-[1201px]:translate-y-0 min-[1201px]:translate-x-full"
          }`}
        >
          <AiChatPanel
            patientId={patientId}
            patientName={patientName}
            initialMessages={initialMessages}
            files={files}
            variant="sidebar"
            onClose={() => setAiOpen(false)}
          />
        </div>
      </div>

      {!aiOpen && (
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
