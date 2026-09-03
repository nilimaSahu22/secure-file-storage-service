"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Mic, MicOff, Send, FileText, ChevronDown, X, Volume2, VolumeX, Loader2, Square } from "lucide-react";
import type { ChatMessage as PrismaChatMessage, MedicalFile } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { useVoiceInput } from "@/lib/hooks/useVoiceInput";

interface AiChatPanelProps {
  patientId: string;
  patientName: string;
  initialMessages: PrismaChatMessage[];
  files: Pick<MedicalFile, "id" | "fileName">[];
  /** "widget": collapsible, triggered by a button — legacy inline trigger.
   *  "page": always expanded, fills its container — used as a standalone portal page.
   *  "sidebar": persistent split-view panel — used on the EMR chart; visibility is
   *  owned by the parent (see ChartShell), so this variant renders unconditionally
   *  open whenever mounted and surfaces a close control via onClose. */
  variant?: "widget" | "page" | "sidebar";
  /** Only used by variant="sidebar" — lets the parent unmount/hide the panel. */
  onClose?: () => void;
}

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citedFileIds: string[];
}

export function AiChatPanel({
  patientId,
  patientName,
  initialMessages,
  files,
  variant = "widget",
  onClose,
}: AiChatPanelProps) {
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
  // BCP-47 code Deepgram detected for the last spoken question, if any. Passed to
  // the chat API so the assistant replies in the language the question was asked in.
  const [spokenLanguage, setSpokenLanguage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // When true, the next question in the input box came from the mic — so its
  // answer should be spoken back rather than just shown as text.
  const askedByVoiceRef = useRef(false);

  const [voiceReplies, setVoiceReplies] = useState(true);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [loadingSpeechId, setLoadingSpeechId] = useState<string | null>(null);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("chat-voice-replies");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored != null) setVoiceReplies(stored === "1");
    } catch {
      /* private mode — keep the default */
    }
  }, []);

  // Must be called from inside a user gesture (mic tap, send, play button) so the
  // AudioContext is "unlocked" — later playback after the async Claude + TTS calls
  // would otherwise be blocked by the browser's autoplay policy.
  const primeAudio = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const Ctx: typeof AudioContext | undefined =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) audioCtxRef.current = new Ctx();
      }
      void audioCtxRef.current?.resume();
    } catch {
      /* ignore */
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    try {
      sourceRef.current?.stop();
    } catch {
      /* already stopped */
    }
    sourceRef.current = null;
    setSpeakingId(null);
    setLoadingSpeechId(null);
  }, []);

  const speak = useCallback(
    async (messageId: string, text: string) => {
      stopSpeaking();
      setSpeechNotice(null);
      setLoadingSpeechId(messageId);
      primeAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) {
        setLoadingSpeechId(null);
        setSpeechNotice("Audio isn't supported in this browser.");
        return;
      }
      try {
        const res = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) {
          setLoadingSpeechId(null);
          setSpeechNotice(
            res.status === 503
              ? "Spoken replies aren't configured for this environment."
              : "Couldn't generate the spoken reply."
          );
          return;
        }
        const buffer = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(buffer);
        stopSpeaking();
        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.connect(ctx.destination);
        source.onended = () => {
          setSpeakingId(null);
          sourceRef.current = null;
        };
        sourceRef.current = source;
        setLoadingSpeechId(null);
        setSpeakingId(messageId);
        source.start();
      } catch {
        setLoadingSpeechId(null);
        setSpeakingId(null);
        setSpeechNotice("Couldn't play the spoken reply.");
      }
    },
    [primeAudio, stopSpeaking]
  );

  // Stop any playback when the panel unmounts (sidebar/page close via the parent).
  useEffect(() => stopSpeaking, [stopSpeaking]);

  const voice = useVoiceInput({
    onTranscript: (text, detectedLanguage) => {
      setSpokenLanguage(detectedLanguage);
      askedByVoiceRef.current = true;
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    },
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

    const askedByVoice = askedByVoiceRef.current;
    askedByVoiceRef.current = false;

    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "user", content: trimmed, citedFileIds: [] }]);
    setInput("");
    setError(null);
    setSending(true);

    try {
      const res = await fetch("/api/chart-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, content: trimmed, language: spokenLanguage }),
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

      // Asked by voice → speak the answer back.
      if (askedByVoice && voiceReplies && typeof data.reply === "string" && data.reply.trim()) {
        void speak(data.id, data.reply);
      }
    } catch {
      setError("Could not get a response. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function toggleVoiceReplies() {
    setVoiceReplies((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("chat-voice-replies", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (!next) stopSpeaking();
      return next;
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    primeAudio();
    sendMessage(input);
  }

  function onMicClick() {
    primeAudio();
    if (voice.recording) voice.stop();
    else voice.start();
  }

  const isSidebar = variant === "sidebar";
  const isPage = variant === "page";

  // isSidebar owns its own explicit height at every breakpoint (never a plain h-full)
  // because ChartShell's wrapper divs are pure shrink-wrap containers around it —
  // if both sides depended on each other's height ("fill my parent" / "fit my child")
  // that's circular and collapses to nothing. Below 1201px it's a small floating
  // popup (Intercom-style widget height); at 1201px+ it's the sticky right-hand dock.
  const wrapperClass = isSidebar
    ? "flex h-[480px] max-h-[70vh] w-full flex-col min-[1201px]:h-[calc(100vh-3rem)] min-[1201px]:max-h-[700px]"
    : isPage
      ? "flex w-full flex-col gap-2"
      : "flex w-full flex-col items-end gap-2 sm:w-80";

  const cardHeightClass = isSidebar
    ? "h-full rounded-xl"
    : isPage
      ? "h-[70vh] rounded-xl"
      : "h-[420px] rounded-xl";

  return (
    <div className={wrapperClass}>
      {variant === "widget" && (
        <Button
          onClick={() =>
            setOpen((o) => {
              if (o) stopSpeaking();
              return !o;
            })
          }
          className="w-full sm:w-auto"
        >
          <MessageCircle size={14} />
          Ask AI
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>
      )}

      {open && (
        <div
          className={`flex w-full flex-col overflow-hidden border border-slate-200 bg-white shadow-lg ${cardHeightClass}`}
        >
          {isSidebar ? (
            <div className="relative border-b border-slate-100 bg-slate-50 px-4 py-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <span className="text-[#2f66ea]">✦</span> Ask AI
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">this chart&apos;s documents only</p>
              <div className="absolute right-3 top-3 flex items-center gap-1">
                {voice.supported && <VoiceReplyToggle on={voiceReplies} onToggle={toggleVoiceReplies} />}
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close Ask AI"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Ask about {patientName}&apos;s documents</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Answers only from documents uploaded to this chart. It will say so plainly if a
                  document doesn&apos;t cover your question.
                </p>
              </div>
              {voice.supported && <VoiceReplyToggle on={voiceReplies} onToggle={toggleVoiceReplies} />}
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
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#2f66ea] px-3 py-2 text-sm text-white">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="max-w-[90%] text-sm leading-relaxed text-slate-700">
                  {m.content}
                  {voice.supported && m.content.trim() && (
                    <button
                      type="button"
                      onClick={() =>
                        speakingId === m.id ? stopSpeaking() : void speak(m.id, m.content)
                      }
                      aria-label={speakingId === m.id ? "Stop" : "Play aloud"}
                      className="ml-1.5 inline-flex h-5 w-5 -translate-y-px items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 align-middle"
                    >
                      {loadingSpeechId === m.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : speakingId === m.id ? (
                        <Square size={11} className="fill-current" />
                      ) : (
                        <Volume2 size={12} />
                      )}
                    </button>
                  )}
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
            {voice.error && <p className="text-xs text-red-600">{voice.error}</p>}
            {speechNotice && <p className="text-xs text-slate-400">{speechNotice}</p>}
          </div>

          {(voice.recording || voice.transcribing) && (
            <div className="flex items-center gap-2 border-t border-slate-100 bg-red-50/60 px-4 py-2">
              <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                <span className="absolute h-2 w-2 animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative h-2 w-2 rounded-full bg-red-500" />
              </span>
              <p className="min-h-[1em] flex-1 text-xs italic text-slate-600">
                {voice.recording ? "Listening… speak in any language, then tap the mic to stop." : "Transcribing…"}
              </p>
            </div>
          )}

          <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-slate-100 p-3">
            <input
              value={input}
              onChange={(e) => {
                askedByVoiceRef.current = false;
                setInput(e.target.value);
              }}
              placeholder={voice.recording ? "Listening…" : voice.transcribing ? "Transcribing…" : "Ask a question"}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {voice.supported && (
              <button
                type="button"
                onClick={onMicClick}
                disabled={voice.transcribing}
                aria-label={voice.recording ? "Stop voice input" : "Start voice input"}
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
                  voice.recording
                    ? "border-red-300 bg-red-50 text-red-600"
                    : "border-slate-300 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {voice.recording && (
                  <span className="absolute inset-0 animate-ping rounded-lg bg-red-400 opacity-30" />
                )}
                <span className="relative">{voice.recording ? <MicOff size={15} /> : <Mic size={15} />}</span>
              </button>
            )}
            {isSidebar ? (
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2f66ea] text-white transition-colors hover:bg-[#2554c7] disabled:cursor-not-allowed disabled:bg-[#a8c0f5]"
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

function VoiceReplyToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      title={on ? "Spoken replies on (for questions you ask by voice)" : "Spoken replies off"}
      className={`flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium transition-colors ${
        on ? "text-[#2f66ea] hover:bg-blue-50" : "text-slate-400 hover:bg-slate-100"
      }`}
    >
      {on ? <Volume2 size={13} /> : <VolumeX size={13} />}
      <span className="hidden sm:inline">Voice</span>
    </button>
  );
}
