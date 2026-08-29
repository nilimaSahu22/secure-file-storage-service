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
        Simple conditional mount, not "always mounted + animate geometry" — that
        approach left an invisible-but-present fixed box behind when "closed",
        which silently swallowed clicks meant for the reopen button underneath it.
        Below 1201px this renders as a small floating popup near the bottom-right
        corner (Intercom/Crisp-style widget), not a full-width/full-height sheet.
        At 1201px+ it's the sticky right-hand dock, unchanged.
      */}
      {aiOpen && (
        <div
          className="animate-[pop-in_180ms_ease-out] fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] max-w-[360px] min-[1201px]:sticky min-[1201px]:top-6 min-[1201px]:right-auto min-[1201px]:bottom-auto min-[1201px]:z-auto min-[1201px]:w-[380px] min-[1201px]:max-w-none min-[1201px]:shrink-0"
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
      )}

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
