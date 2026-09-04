"use client";

import { Info } from "lucide-react";
import { useAssistant } from "@/components/assistant/AssistantController";

const SUPPORT_PHONE = "(555) 010-2200";

export function PortalHelpBar() {
  const assistant = useAssistant();

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      <Info size={16} className="mt-0.5 shrink-0 text-slate-400" />
      <p>
        Not sure what something means?{" "}
        <button
          type="button"
          onClick={() => assistant.openNew()}
          className="font-medium text-blue-700 hover:underline"
        >
          Ask your care team
        </button>{" "}
        or call us at <span className="font-medium text-slate-700">{SUPPORT_PHONE}</span>.
      </p>
    </div>
  );
}
