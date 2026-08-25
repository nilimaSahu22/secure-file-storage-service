import { useState, type ReactNode } from "react";
import { Button } from "../ui/Button";
import type { AgentStep } from "./mockConversation";

type Autonomy = "propose" | "acts";

interface ProposalCardProps {
  steps: AgentStep[];
  caution: string;
  autonomy: Autonomy;
  onApprove: () => void;
  onDismiss: () => void;
}

function renderBoldedText(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[#0F172A]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ProposalCard({ steps, caution, autonomy, onApprove, onDismiss }: ProposalCardProps) {
  const [status, setStatus] = useState<"pending" | "approved">(
    autonomy === "acts" ? "approved" : "pending"
  );

  const headerLabel = status === "approved" ? "Completed" : "Proposed plan";
  const primaryLabel =
    autonomy === "acts" ? "View share link" : status === "approved" ? "Approved" : "Approve and share";
  const primaryDisabled = autonomy !== "acts" && status === "approved";

  function handleApprove() {
    if (autonomy === "acts") return;
    setStatus("approved");
    onApprove();
  }

  return (
    <div className="rounded-[7px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between border-b border-[#F1F5F9] px-3.5 py-2.5">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#1D4ED8]">
          {headerLabel}
        </span>
        <span className="text-[11px] text-[#94A3B8]">{steps.length} steps</span>
      </div>

      <div className="px-3.5 py-3">
        <div className="flex flex-col gap-2.5">
          {steps.map((step) => (
            <div key={step.n} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border border-[#BFDBFE] bg-[#EFF6FF] text-[10px] font-medium text-[#1D4ED8]">
                {step.n}
              </span>
              <span className="text-[13px] leading-[1.5] text-[#334155]">
                {renderBoldedText(step.text)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-[5px] border border-[#FDE68A] bg-[#FEFCE8] px-2.5 py-2 text-[12px] text-[#854D0E]">
          {caution}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-b-[7px] border-t border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5">
        <Button
          variant="primary"
          onClick={handleApprove}
          disabled={primaryDisabled}
          className="px-3 py-1.5 text-xs"
        >
          {primaryLabel}
        </Button>
        <Button variant="outlined" className="px-3 py-1.5 text-xs">
          Edit steps
        </Button>
        <Button variant="ghost" onClick={onDismiss} className="ml-auto px-3 py-1.5 text-xs">
          Dismiss
        </Button>
      </div>
    </div>
  );
}
