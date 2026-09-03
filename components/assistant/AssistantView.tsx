"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Plus,
  Mic,
  MicOff,
  Send,
  Volume2,
  Loader2,
  Square,
  PanelLeftClose,
  PanelLeft,
  Pencil,
  Archive,
  FileText,
  X,
  Check,
  CircleAlert,
  Download,
} from "lucide-react";
import { useVoiceInput } from "@/lib/hooks/useVoiceInput";
import { FocusedPatientPicker } from "@/components/assistant/FocusedPatientPicker";
import type { AssistantMessageView } from "@/lib/services/assistant";

export interface ThreadSummary {
  id: string;
  title: string;
  focusedPatientId: string | null;
  archived: boolean;
}

export interface ProposedAction {
  id: string;
  tool: string;
  summary: string;
  status: "proposed" | "done" | "failed";
  result?: string;
}

interface MessageState {
  id: string;
  role: "user" | "assistant";
  content: string;
  citedFiles: { id: string; fileName: string }[];
  actions: ProposedAction[];
}

interface AssistantViewProps {
  ownerType: "staff" | "patient";
  initialThreads: ThreadSummary[];
  activeThreadId: string | null;
  initialMessages: AssistantMessageView[];
  focusedPatient: { id: string; name: string } | null;
}

function toState(m: AssistantMessageView): MessageState {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    citedFiles: m.citedFiles ?? [],
    actions: (Array.isArray(m.actions) ? (m.actions as ProposedAction[]) : []) ?? [],
  };
}

export function AssistantView({
  ownerType,
  initialThreads,
  activeThreadId,
  initialMessages,
  focusedPatient: initialFocusedPatient,
}: AssistantViewProps) {
  const router = useRouter();
  const params = useSearchParams();

  const [threads, setThreads] = useState<ThreadSummary[]>(initialThreads);
  const [threadId, setThreadId] = useState<string | null>(activeThreadId);
  const [messages, setMessages] = useState<MessageState[]>(initialMessages.map(toState));
  const [focusedPatient, setFocusedPatient] = useState(initialFocusedPatient);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ fileName: string; url: string } | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const askedByVoiceRef = useRef(false);
  const spokenLanguageRef = useRef<string | null>(null);

  // ---- voice out (AudioContext unlock pattern, shared with AiChatPanel) ----
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [loadingSpeechId, setLoadingSpeechId] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const primeAudio = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const Ctx: typeof AudioContext | undefined =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
      primeAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      setLoadingSpeechId(messageId);
      try {
        const res = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) {
          setLoadingSpeechId(null);
          return;
        }
        const decoded = await ctx.decodeAudioData(await res.arrayBuffer());
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
      }
    },
    [primeAudio, stopSpeaking]
  );

  useEffect(() => stopSpeaking, [stopSpeaking]);

  const voice = useVoiceInput({
    onTranscript: (text, detectedLanguage) => {
      spokenLanguageRef.current = detectedLanguage;
      askedByVoiceRef.current = true;
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const syncUrl = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (id) next.set("thread", id);
      else next.delete("thread");
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [params, router]
  );

  async function openThread(id: string) {
    if (id === threadId) return;
    stopSpeaking();
    setError(null);
    try {
      const res = await fetch(`/api/assistant/threads/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setThreadId(id);
      setMessages((data.messages ?? []).map(toState));
      const t: ThreadSummary | undefined = threads.find((x) => x.id === id);
      setFocusedPatient(
        t?.focusedPatientId ? { id: t.focusedPatientId, name: "" } : null
      );
      syncUrl(id);
    } catch {
      /* ignore */
    }
  }

  function newThread() {
    stopSpeaking();
    setThreadId(null);
    setMessages([]);
    setFocusedPatient(null);
    setError(null);
    syncUrl(null);
  }

  async function setFocus(patient: { id: string; name: string } | null) {
    setFocusedPatient(patient);
    if (threadId) {
      await fetch(`/api/assistant/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focusedPatientId: patient?.id ?? null }),
      }).catch(() => null);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const askedByVoice = askedByVoiceRef.current;
    askedByVoiceRef.current = false;

    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: "user", content: text, citedFiles: [], actions: [] },
    ]);
    setInput("");
    setError(null);
    setSending(true);
    primeAudio();

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          message: text,
          language: spokenLanguageRef.current,
          focusedPatientId: focusedPatient?.id ?? null,
        }),
      });
      if (!res.ok) {
        setError("Could not get a response. Please try again.");
        return;
      }
      const data = await res.json();
      const isNew = !threadId;
      setThreadId(data.threadId);
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId,
          role: "assistant",
          content: data.reply,
          citedFiles: data.citedFiles ?? [],
          actions: (data.actions ?? []) as ProposedAction[],
        },
      ]);
      if (isNew) {
        setThreads((prev) => [
          { id: data.threadId, title: data.title, focusedPatientId: focusedPatient?.id ?? null, archived: false },
          ...prev,
        ]);
        syncUrl(data.threadId);
      } else {
        setThreads((prev) =>
          prev.map((t) => (t.id === data.threadId ? { ...t, title: data.title } : t))
        );
      }
      if (askedByVoice && typeof data.reply === "string" && data.reply.trim()) {
        void speak(data.messageId, data.reply);
      }
    } catch {
      setError("Could not get a response. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function resolveAction(messageId: string, action: ProposedAction, cancel: boolean) {
    if (!threadId || confirmingId) return;
    setConfirmingId(action.id);
    try {
      const res = await fetch("/api/assistant/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, actionId: action.id, cancel }),
      });
      const data = await res.json().catch(() => null);
      const status: ProposedAction["status"] = cancel ? "failed" : data?.ok ? "done" : "failed";
      const result = cancel ? "Dismissed." : (data?.message ?? "");
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id === messageId
            ? { ...m, actions: m.actions.map((a) => (a.id === action.id ? { ...a, status, result } : a)) }
            : m
        );
        if (!cancel && data?.message) {
          next.push({ id: `local-${Date.now()}`, role: "assistant", content: data.message, citedFiles: [], actions: [] });
        }
        return next;
      });
    } finally {
      setConfirmingId(null);
    }
  }

  async function openPreview(fileId: string, fileName: string) {
    setPreviewingId(fileId);
    try {
      const res = await fetch(`/api/files/${fileId}/download`);
      if (!res.ok) return;
      const { url } = await res.json();
      setPreview({ fileName, url });
    } finally {
      setPreviewingId(null);
    }
  }

  async function commitRename(id: string) {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
    await fetch(`/api/assistant/threads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).catch(() => null);
  }

  async function archive(id: string) {
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (id === threadId) newThread();
    await fetch(`/api/assistant/threads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    }).catch(() => null);
  }

  return (
    <div className="flex h-[calc(100vh-var(--assistant-chrome,7rem))] min-h-[520px] overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Thread rail */}
      {railOpen ? (
        <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-3">
            <button
              onClick={newThread}
              className="flex flex-1 items-center gap-1.5 rounded-lg bg-[#2f66ea] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2554c7]"
            >
              <Plus size={14} /> New chat
            </button>
            <button
              onClick={() => setRailOpen(false)}
              aria-label="Hide conversation list"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {threads.length === 0 && (
              <p className="px-2 py-3 text-xs text-slate-400">No conversations yet.</p>
            )}
            {threads.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-sm ${
                  t.id === threadId ? "bg-white shadow-sm" : "hover:bg-slate-100"
                }`}
              >
                {renamingId === t.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(t.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="min-w-0 flex-1 rounded border border-slate-300 px-1.5 py-0.5 text-xs outline-none"
                  />
                ) : (
                  <button
                    onClick={() => openThread(t.id)}
                    className="min-w-0 flex-1 truncate text-left text-slate-700"
                    title={t.title}
                  >
                    {t.title}
                  </button>
                )}
                <button
                  onClick={() => {
                    setRenamingId(t.id);
                    setRenameValue(t.title);
                  }}
                  aria-label="Rename"
                  className="hidden h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-600 group-hover:flex"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => archive(t.id)}
                  aria-label="Archive"
                  className="hidden h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-600 group-hover:flex"
                >
                  <Archive size={12} />
                </button>
              </div>
            ))}
          </div>
        </aside>
      ) : (
        <button
          onClick={() => setRailOpen(true)}
          aria-label="Show conversation list"
          className="flex h-10 w-10 shrink-0 items-center justify-center border-r border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        >
          <PanelLeft size={16} />
        </button>
      )}

      {/* Chat column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Sparkles size={15} className="text-[#2f66ea]" /> Assistant
          </p>
          {ownerType === "staff" && (
            <FocusedPatientPicker value={focusedPatient} onChange={setFocus} />
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            {messages.length === 0 && (
              <div className="mt-10 text-center text-sm text-slate-400">
                {ownerType === "staff"
                  ? "Pick a patient above, then ask about their chart, documents, appointments, or tasks."
                  : "Ask about your visits, documents, appointments, or reminders."}
              </div>
            )}
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[#2f66ea] px-3.5 py-2 text-sm text-white">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {m.content}
                  {voice.supported && m.content.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        if (speakingId === m.id) stopSpeaking();
                        else void speak(m.id, m.content);
                      }}
                      aria-label={speakingId === m.id ? "Stop" : "Play aloud"}
                      className="ml-1.5 inline-flex h-5 w-5 -translate-y-px items-center justify-center rounded align-middle text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
                  {m.citedFiles.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.citedFiles.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => openPreview(f.id, f.fileName)}
                          disabled={previewingId === f.id}
                          className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                        >
                          {previewingId === f.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <FileText size={10} />
                          )}
                          {f.fileName}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.actions.map((a) => (
                    <div
                      key={a.id}
                      className={`mt-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                        a.status === "done"
                          ? "border-green-200 bg-green-50"
                          : a.status === "failed"
                            ? "border-slate-200 bg-slate-50"
                            : "border-blue-200 bg-blue-50"
                      }`}
                    >
                      <p className="flex items-start gap-1.5 text-slate-800">
                        {a.status === "done" ? (
                          <Check size={14} className="mt-0.5 shrink-0 text-green-600" />
                        ) : a.status === "failed" ? (
                          <CircleAlert size={14} className="mt-0.5 shrink-0 text-slate-400" />
                        ) : null}
                        {a.status === "done" ? a.result || a.summary : a.summary}
                      </p>
                      {a.status === "proposed" && (
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => resolveAction(m.id, a, false)}
                            disabled={confirmingId === a.id}
                            className="flex items-center gap-1 rounded-md bg-[#2f66ea] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#2554c7] disabled:bg-[#a8c0f5]"
                          >
                            {confirmingId === a.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            Confirm
                          </button>
                          <button
                            onClick={() => resolveAction(m.id, a, true)}
                            disabled={confirmingId === a.id}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
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
          </div>
        </div>

        {(voice.recording || voice.transcribing) && (
          <div className="flex items-center gap-2 border-t border-slate-100 bg-red-50/60 px-4 py-2">
            <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-red-500" />
            </span>
            <p className="flex-1 text-xs italic text-slate-600">
              {voice.recording ? "Listening… tap the mic to stop." : "Transcribing…"}
            </p>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            primeAudio();
            send();
          }}
          className="flex items-center gap-2 border-t border-slate-100 p-3"
        >
          <input
            value={input}
            onChange={(e) => {
              askedByVoiceRef.current = false;
              setInput(e.target.value);
            }}
            placeholder="Ask the assistant…"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          {voice.supported && (
            <button
              type="button"
              onClick={() => {
                primeAudio();
                if (voice.recording) voice.stop();
                else voice.start();
              }}
              disabled={voice.transcribing}
              aria-label={voice.recording ? "Stop voice input" : "Start voice input"}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
                voice.recording
                  ? "border-red-300 bg-red-50 text-red-600"
                  : "border-slate-300 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {voice.recording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2f66ea] text-white transition-colors hover:bg-[#2554c7] disabled:bg-[#a8c0f5]"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </form>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 p-4 sm:p-8"
          onClick={() => setPreview(null)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <p className="truncate text-sm font-medium text-slate-900">{preview.fileName}</p>
              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                >
                  <Download size={13} /> Download
                </a>
                <button
                  onClick={() => setPreview(null)}
                  aria-label="Close preview"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-slate-50">
              {/\.(png|jpe?g|gif|webp)$/i.test(preview.fileName) ? (
                <div className="flex h-full items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview.url} alt={preview.fileName} className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <iframe src={preview.url} title={preview.fileName} className="h-full w-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
