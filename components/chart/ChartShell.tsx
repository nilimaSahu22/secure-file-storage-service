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
    <div
      className={`grid grid-cols-1 gap-6 min-[1201px]:items-start ${
        aiOpen ? "min-[1201px]:grid-cols-[1fr_380px]" : "min-[1201px]:grid-cols-1"
      }`}
    >
      <div className="flex flex-col gap-6">{children}</div>

      {aiOpen && (
        <AiChatPanel
          patientId={patientId}
          patientName={patientName}
          initialMessages={initialMessages}
          files={files}
          variant="sidebar"
          onClose={() => setAiOpen(false)}
        />
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
