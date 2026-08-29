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

      {/*
        Stays mounted at all times so the open/close transition can actually animate
        (an unmounted element has no "from" state to transition out of). The outer
        div collapses width (with overflow-hidden) so the left column reflows into
        the freed space; the inner div slides via translate-x so it visually enters
        and exits from the right edge, matching a Cursor/Copilot-style dock panel.
        Below 1201px there's no room to dock a sidebar, so it just shows/hides.
      */}
      <div
        className={`overflow-hidden transition-[width] duration-300 ease-in-out min-[1201px]:sticky min-[1201px]:top-6 min-[1201px]:shrink-0 ${
          aiOpen ? "min-[1201px]:w-[380px]" : "hidden min-[1201px]:block min-[1201px]:w-0"
        }`}
      >
        <div
          className={`w-full transition-transform duration-300 ease-in-out min-[1201px]:w-[380px] ${
            aiOpen ? "translate-x-0" : "min-[1201px]:translate-x-full"
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
