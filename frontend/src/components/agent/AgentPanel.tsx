import { useEffect, useRef, useState } from "react";
import { showToast } from "../ui/Toast";
import { MessageBubble } from "./MessageBubble";
import { ProposalCard } from "./ProposalCard";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { Composer } from "./Composer";
import { initialMessages, craftCannedReply, nextMockId, type AgentMessage } from "./mockConversation";

export type Autonomy = "propose" | "acts";

export interface AgentPanelProps {
  autonomy?: Autonomy;
  showCitations?: boolean;
  onClose?: () => void;
}

const REPLY_DELAY_MS = 700;

export function AgentPanel({ autonomy = "propose", showCitations = true, onClose }: AgentPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages);
  const replyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
    };
  }, []);

  function handleSend(text: string) {
    const userMessage: AgentMessage = { id: nextMockId("user"), role: "user", text };
    setMessages((prev) => [...prev, userMessage]);

    replyTimeoutRef.current = setTimeout(() => {
      setMessages((prev) => [...prev, craftCannedReply()]);
    }, REPLY_DELAY_MS);
  }

  function handleApprove() {
    showToast.success("Share link copied");
  }

  function handleDismiss(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div
      className="flex flex-col border-l border-[#E2E8F0] bg-white"
      style={{ flex: "0 0 416px", width: "416px", height: "100vh", position: "sticky", top: 0 }}
    >
      <style>{`
        @keyframes agentBlink {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
      `}</style>

      <div className="border-b border-[#F1F5F9] px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-[#0F172A] text-[11px] font-semibold text-[#93C5FD]">
            C
          </span>
          <span className="font-serif text-[15px] font-medium text-[#0F172A]">Ask Caselight</span>
          <span className="ml-auto text-[11px] text-[#64748B]">
            {autonomy === "acts" ? "Acting autonomously" : "Approval required"}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-[#E2E8F0] text-[11px] text-[#64748B] hover:border-[#93C5FD] hover:text-[#1D4ED8]"
            >
              ×
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-1.5 rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563EB]" />
          <span className="text-[11.5px] text-[#64748B]">
            Scoped to your documents. Every query and action is audit-logged.
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-[18px] py-[18px]">
        {messages.map((message) => {
          if (message.role === "user" || message.role === "assistant") {
            return <MessageBubble key={message.id} message={message} showCitations={showCitations} />;
          }
          if (message.role === "proposal") {
            return (
              <ProposalCard
                key={message.id}
                steps={message.steps}
                caution={message.caution}
                autonomy={autonomy}
                onApprove={handleApprove}
                onDismiss={() => handleDismiss(message.id)}
              />
            );
          }
          return <ThinkingIndicator key={message.id} caption={message.caption} />;
        })}
      </div>

      <Composer onSend={handleSend} />
    </div>
  );
}
