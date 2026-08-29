"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Mic, MicOff, Send, FileText, ChevronDown } from "lucide-react";
import type { ChatMessage as PrismaChatMessage, MedicalFile } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { useSpeechRecognition } from "@/lib/hooks/useSpeechRecognition";

interface AiChatPanelProps {
  patientId: string;
  patientName: string;
  initialMessages: PrismaChatMessage[];
  files: Pick<MedicalFile, "id" | "fileName">[];
  /** "widget": collapsible, triggered by a button — legacy inline trigger.
   *  "page": always expanded, fills its container — used as a standalone portal page.
   *  "sidebar": always expanded, persistent split-view panel — used on the EMR chart. */
  variant?: "widget" | "page" | "sidebar";
}

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citedFileIds: string[];
}

export function AiChatPanel({ patientId, patientName, initialMessages, files, variant = "widget" }: AiChatPanelProps) {
  const [open, setOpen] = useState(variant !== "widget");
  const [messages, setMessages] = useState<DisplayMessage[]>(() =>
    initialMessages.map((m) => ({
      id: m.id,
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
      citedFileIds: m.citedFileIds,
    }))
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const speech = useSpeechRecognition({
    onFinalTranscript: (text) => setInput((prev) => (prev ? `${prev} ${text}` : text)),
  });

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, open]);

  function fileName(fileId: string): string {
    return files.find((f) => f.id === fileId)?.fileName ?? "document";
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "user", content: trimmed, citedFileIds: [] }]);
    setInput("");
    setError(null);
    setSending(true);

    try {
      const res = await fetch("/api/chart-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, content: trimmed }),
      });

      if (!res.ok) {
        setError("Could not get a response. Please try again.");
        return;
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { id: data.id, role: "assistant", content: data.reply, citedFileIds: data.citedFileIds ?? [] },
      ]);
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
    if (speech.listening) speech.stop();
    else speech.start();
  }

  const isSidebar = variant === "sidebar";
  const isPage = variant === "page";

  const wrapperClass = isSidebar
    ? "flex h-full w-full flex-col min-[901px]:w-[380px] min-[901px]:shrink-0"
    : isPage
      ? "flex w-full flex-col gap-2"
      : "flex w-full flex-col items-end gap-2 sm:w-80";

  const cardHeightClass = isSidebar
    ? "h-full min-h-[420px] max-[520px]:min-h-[320px]"
    : isPage
      ? "h-[70vh]"
      : "h-[420px]";

  return (
    <div className={wrapperClass}>
      {variant === "widget" && (
        <Button onClick={() => setOpen((o) => !o)} className="w-full sm:w-auto">
          <MessageCircle size={14} />
          Ask AI
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>
      )}

      {open && (
        <div
          className={`flex w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ${cardHeightClass}`}
        >
          {isSidebar ? (
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <span className="text-blue-600">✦</span> Ask AI
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">this chart&apos;s documents only</p>
            </div>
          ) : (
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
              <p className="text-sm font-semibold text-slate-900">Ask about {patientName}&apos;s documents</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Answers only from documents uploaded to this chart. It will say so plainly if a
                document doesn&apos;t cover your question.
              </p>
            </div>
          )}

          <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <p className="mt-6 text-center text-xs text-slate-400">
                Ask a question like &quot;What did the discharge summary say about follow-up
                care?&quot;
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
                  {m.citedFileIds.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.citedFileIds.map((fid) => (
                        <span
                          key={fid}
                          className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
                        >
                          <FileText size={10} />
                          {fileName(fid)}
                        </span>
                      ))}
                    </div>
                  )}
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

          {speech.listening && (
            <div className="flex items-center gap-2 border-t border-slate-100 bg-red-50/60 px-4 py-2">
              <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                <span className="absolute h-2 w-2 animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative h-2 w-2 rounded-full bg-red-500" />
              </span>
              <p className="min-h-[1em] flex-1 text-xs italic text-slate-600">
                {speech.interimTranscript || "Listening…"}
              </p>
            </div>
          )}

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
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                  speech.listening
                    ? "border-red-300 bg-red-50 text-red-600"
                    : "border-slate-300 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {speech.listening && (
                  <span className="absolute inset-0 animate-ping rounded-lg bg-red-400 opacity-30" />
                )}
                <span className="relative">{speech.listening ? <MicOff size={15} /> : <Mic size={15} />}</span>
              </button>
            )}
            {isSidebar ? (
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                <Send size={14} />
              </button>
            ) : (
              <Button type="submit" size="sm" disabled={sending || !input.trim()}>
                <Send size={14} />
              </Button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
