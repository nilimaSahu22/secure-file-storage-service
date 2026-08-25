import { useState, type KeyboardEvent } from "react";
import { Button } from "../ui/Button";
import { suggestionChips } from "./mockConversation";

interface ComposerProps {
  onSend: (text: string) => void;
}

export function Composer({ onSend }: ComposerProps) {
  const [value, setValue] = useState("");

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-[#E2E8F0] px-4 py-3.5">
      <div className="mb-2.5 flex flex-wrap gap-2">
        {suggestionChips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setValue(chip)}
            className="rounded-[999px] border border-[#E2E8F0] px-3 py-1.5 text-xs text-[#334155] transition-colors hover:border-[#93C5FD] hover:text-[#1D4ED8]"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a document, or describe a task…"
          className="flex-1 rounded-[7px] border border-[#CBD5E1] px-3 py-2.5 text-[13px] text-[#0F172A] outline-none focus:border-[#2563EB]"
        />
        <Button variant="primary" onClick={handleSend} className="px-3 py-2.5 text-xs">
          Send
        </Button>
      </div>
    </div>
  );
}
