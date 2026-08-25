"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Mic, MicOff, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useSpeechRecognition } from "@/lib/hooks/useSpeechRecognition";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatAssistantProps {
  patientId: string;
  patientName: string;
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `msg-${Date.now()}-${idCounter}`;
}

export function ChatAssistant({ patientId, patientName }: ChatAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const speech = useSpeechRecognition({
    onFinalTranscript: (text) => setInput((prev) => (prev ? `${prev} ${text}` : text)),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMessage: ChatMessage = { id: nextId(), role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        setError("Could not get a response. Please try again.");
        return;
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: data.reply }]);
    } catch {
      setError("Could not get a response. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function onMicClick() {
    if (speech.listening) {
      speech.stop();
    } else {
      speech.start();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition-colors hover:bg-blue-700"
      >
        <MessageCircle size={16} />
        Ask about this chart
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex h-[560px] w-[380px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            Ask about {patientName}
            <Badge tone="blue">
              <Sparkles size={9} className="mr-1 inline" />
              AI Preview
            </Badge>
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
        Answers are generated only from this patient&apos;s chart. Read-only — it cannot change
        the chart or take actions.
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="mt-6 text-center text-xs text-slate-400">
            Ask a question like &quot;What changed since the last visit?&quot; or &quot;Any
            active allergy conflicts?&quot;
          </p>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 px-3 py-2 text-sm text-white">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="max-w-[90%] text-sm leading-relaxed text-slate-700">
              {m.content}
            </div>
          )
        )}
        {sending && (
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:0.15s]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:0.3s]" />
          </div>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
        {speech.error && <p className="text-xs text-red-600">{speech.error}</p>}
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-slate-100 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={speech.listening ? "Listening…" : "Ask a question"}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {speech.supported && (
          <button
            type="button"
            onClick={onMicClick}
            aria-label={speech.listening ? "Stop voice input" : "Start voice input"}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
              speech.listening
                ? "border-red-300 bg-red-50 text-red-600"
                : "border-slate-300 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {speech.listening ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
        )}
        <Button type="submit" size="sm" disabled={sending || !input.trim()}>
          <Send size={14} />
        </Button>
      </form>
    </div>
  );
}
