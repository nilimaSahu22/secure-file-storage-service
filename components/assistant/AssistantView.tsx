"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  SquarePen,
  Mic,
  MicOff,
  ArrowUp,
  Volume2,
  Loader2,
  Square,
  PanelLeft,
  PanelLeftClose,
  Maximize2,
  X,
  Pencil,
  Archive,
  FileText,
  Check,
  CircleAlert,
  Download,
  MessageSquare,
  Stethoscope,
  CalendarClock,
  ListChecks,
  FolderSearch,
} from "lucide-react";
import { useVoiceInput } from "@/lib/hooks/useVoiceInput";
import { FocusedPatientPicker } from "@/components/assistant/FocusedPatientPicker";
import type { AssistantMessageView } from "@/lib/services/assistant";

export interface ThreadSummary {
  id: string;
  title: string;
  focusedPatientId: string | null;
  archived: boolean;
  updatedAt: string | Date;
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
  variant?: "full" | "panel";
  initialThreads: ThreadSummary[];
  activeThreadId: string | null;
  initialMessages: AssistantMessageView[];
  focusedPatient: { id: string; name: string } | null;
  onExpand?: () => void;
  onClose?: () => void;
}

const DEFAULT_TITLE_LABELS = new Set(["New conversation", "New chat"]);

const TOOL_LABELS: Record<string, string> = {
  find_patient: "Finding the patient",
  get_patient_summary: "Reading the chart",
  get_clinical_notes: "Reading clinical notes",
  search_patient_documents: "Searching documents",
  list_appointments: "Checking appointments",
  list_tasks: "Checking tasks",
  list_prior_auths: "Checking prior authorisations",
  list_referrals: "Checking referrals",
  list_visits: "Reviewing visits",
  list_followups: "Checking follow-ups",
  list_document_requests: "Checking document requests",
  get_department_workflow: "Reading the workflow",
  get_providers: "Looking up providers",
  check_trends: "Checking trends",
  search_audit_log: "Searching the audit log",
};

const STAFF_SUGGESTIONS = [
  { icon: Stethoscope, label: "Summarise this patient's recent visits", prompt: "Summarise this patient's recent visits." },
  { icon: FolderSearch, label: "What do the latest documents say?", prompt: "What do the latest uploaded documents say?" },
  { icon: CalendarClock, label: "Show upcoming appointments", prompt: "What appointments does this patient have coming up?" },
  { icon: ListChecks, label: "What tasks are open?", prompt: "What tasks are open for this patient?" },
];

const PATIENT_SUGGESTIONS = [
  { icon: Stethoscope, label: "Explain my latest visit", prompt: "Can you explain my latest visit in plain language?" },
  { icon: FolderSearch, label: "What documents were requested from me?", prompt: "What documents have been requested from me?" },
  { icon: CalendarClock, label: "Request an appointment", prompt: "I'd like to request an appointment." },
  { icon: ListChecks, label: "What reminders do I have?", prompt: "What reminders or follow-ups do I have?" },
];

function toState(m: AssistantMessageView): MessageState {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    citedFiles: m.citedFiles ?? [],
    actions: (Array.isArray(m.actions) ? (m.actions as ProposedAction[]) : []) ?? [],
  };
}

function relativeTime(value: string | Date): string {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

function groupThreads(threads: ThreadSummary[]): { label: string; items: ThreadSummary[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86_400_000;
  const buckets: Record<string, ThreadSummary[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 days": [],
    Older: [],
  };
  for (const t of threads) {
    const ts = new Date(t.updatedAt).getTime();
    if (ts >= startOfToday) buckets.Today.push(t);
    else if (ts >= startOfToday - day) buckets.Yesterday.push(t);
    else if (ts >= startOfToday - 7 * day) buckets["Previous 7 days"].push(t);
    else buckets.Older.push(t);
  }
  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export function AssistantView({
  ownerType,
  variant = "full",
  initialThreads,
  activeThreadId,
  initialMessages,
  focusedPatient: initialFocusedPatient,
  onExpand,
  onClose,
}: AssistantViewProps) {
  const isPanel = variant === "panel";
  const router = useRouter();
  const params = useSearchParams();

  const [threads, setThreads] = useState<ThreadSummary[]>(initialThreads);
  const [threadId, setThreadId] = useState<string | null>(activeThreadId);
  const [messages, setMessages] = useState<MessageState[]>(initialMessages.map(toState));
  const [focusedPatient, setFocusedPatient] = useState(initialFocusedPatient);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [workLabel, setWorkLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(!isPanel);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ fileName: string; url: string } | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  function autoGrow() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  const syncUrl = useCallback(
    (id: string | null) => {
      if (isPanel) return;
      const next = new URLSearchParams(params.toString());
      if (id) next.set("thread", id);
      else next.delete("thread");
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [isPanel, params, router]
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
      setFocusedPatient(t?.focusedPatientId ? { id: t.focusedPatientId, name: "" } : null);
      if (isPanel) setRailOpen(false);
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
    if (isPanel) setRailOpen(false);
    syncUrl(null);
    inputRef.current?.focus();
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

  async function send(override?: string) {
    const text = (override ?? input).trim();
    if (!text || sending) return;
    const askedByVoice = askedByVoiceRef.current;
    askedByVoiceRef.current = false;

    const streamingId = `stream-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: "user", content: text, citedFiles: [], actions: [] },
      { id: streamingId, role: "assistant", content: "", citedFiles: [], actions: [] },
    ]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setError(null);
    setSending(true);
    setWorkLabel("Working");
    primeAudio();

    const patchStreaming = (fn: (m: MessageState) => MessageState) =>
      setMessages((prev) => prev.map((m) => (m.id === streamingId ? fn(m) : m)));

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
      if (!res.ok || !res.body) {
        setMessages((prev) => prev.filter((m) => m.id !== streamingId));
        setError("Could not get a response. Please try again.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done: {
        threadId: string;
        messageId: string;
        reply: string;
        title: string;
        citedFiles?: { id: string; fileName: string }[];
        actions?: ProposedAction[];
      } | null = null;

      for (;;) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const line = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const evt = JSON.parse(line.slice(6));
          if (evt.t === "delta") {
            patchStreaming((m) => ({ ...m, content: m.content + evt.v }));
          } else if (evt.t === "tool") {
            setWorkLabel(TOOL_LABELS[evt.name] ?? "Working");
          } else if (evt.t === "reset") {
            patchStreaming((m) => ({ ...m, content: "" }));
          } else if (evt.t === "error") {
            setError(evt.message ?? "Could not get a response.");
          } else if (evt.t === "done") {
            done = evt;
          }
        }
      }

      if (!done) {
        setError((e) => e ?? "Could not get a response. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== streamingId || m.content));
        return;
      }
      const data = done;
      const isNew = !threadId;
      setThreadId(data.threadId);
      patchStreaming((m) => ({
        ...m,
        id: data.messageId,
        content: data.reply,
        citedFiles: data.citedFiles ?? [],
        actions: (data.actions ?? []) as ProposedAction[],
      }));
      if (isNew) {
        setThreads((prev) => [
          {
            id: data.threadId,
            title: data.title,
            focusedPatientId: focusedPatient?.id ?? null,
            archived: false,
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        syncUrl(data.threadId);
      } else {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === data.threadId ? { ...t, title: data.title, updatedAt: new Date().toISOString() } : t
          )
        );
      }
      if (askedByVoice && typeof data.reply === "string" && data.reply.trim()) {
        void speak(data.messageId, data.reply);
      }
    } catch {
      setError("Could not get a response. Please try again.");
    } finally {
      setSending(false);
      setWorkLabel(null);
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
      const result = cancel ? "Dismissed." : data?.message ?? "";
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

  const activeThread = threads.find((t) => t.id === threadId);
  const headerTitle =
    activeThread && !DEFAULT_TITLE_LABELS.has(activeThread.title) ? activeThread.title : "Ask AI";
  const streaming = messages.some((m) => m.id.startsWith("stream-") && m.content);
  const suggestions = ownerType === "staff" ? STAFF_SUGGESTIONS : PATIENT_SUGGESTIONS;
  const groups = groupThreads(threads);

  const rail = (
    <aside
      className={`flex w-60 shrink-0 flex-col bg-slate-50/80 ${
        isPanel ? "absolute inset-y-0 left-0 z-20 border-r border-slate-200 shadow-lg" : "border-r border-slate-200"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-3">
        <button
          onClick={newThread}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <SquarePen size={14} /> New chat
        </button>
        <button
          onClick={() => setRailOpen(false)}
          aria-label="Hide conversation list"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {groups.length === 0 && <p className="px-2 py-3 text-xs text-slate-400">No conversations yet.</p>}
        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {group.label}
            </p>
            {group.items.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${
                  t.id === threadId ? "bg-white shadow-sm ring-1 ring-slate-200/60" : "hover:bg-slate-100"
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
                  <>
                    <button
                      onClick={() => openThread(t.id)}
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-slate-700"
                      title={t.title}
                    >
                      <MessageSquare size={13} className="shrink-0 text-slate-400" />
                      <span className="truncate">{t.title}</span>
                    </button>
                    <span className="shrink-0 text-[11px] text-slate-400 group-hover:hidden">
                      {relativeTime(t.updatedAt)}
                    </span>
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
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );

  const composer = (
    <div className="mx-auto w-full max-w-[46rem] px-4 pb-4 pt-2">
      {messages.length === 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-sm font-semibold text-slate-900">What can I help you with?</p>
          <div className="flex flex-col">
            {suggestions.map((s) => (
              <button
                key={s.label}
                onClick={() => {
                  primeAudio();
                  void send(s.prompt);
                }}
                className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                <s.icon size={14} className="shrink-0 text-slate-400" />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          primeAudio();
          void send();
        }}
        className="relative rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors focus-within:border-slate-300"
      >
        <textarea
          ref={inputRef}
          value={input}
          rows={1}
          onChange={(e) => {
            askedByVoiceRef.current = false;
            setInput(e.target.value);
            autoGrow();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              primeAudio();
              void send();
            }
          }}
          placeholder="Ask, search or make anything…"
          className="max-h-52 w-full resize-none bg-transparent px-4 pb-12 pt-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2.5 py-2">
          <span className="text-[11px] text-slate-300">{sending ? "" : "Shift + Enter for a new line"}</span>
          <div className="flex items-center gap-1.5">
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
                className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
                  voice.recording
                    ? "border-red-300 bg-red-50 text-red-600"
                    : "border-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                }`}
              >
                {voice.recording ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
            )}
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2f66ea] text-white transition-colors hover:bg-[#2554c7] disabled:bg-slate-200 disabled:text-slate-400"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} />}
            </button>
          </div>
        </div>
      </form>
      {(voice.recording || voice.transcribing) && (
        <p className="mt-1.5 flex items-center gap-1.5 px-1 text-xs italic text-slate-500">
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative h-2 w-2 rounded-full bg-red-500" />
          </span>
          {voice.recording ? "Listening… tap the mic to stop." : "Transcribing…"}
        </p>
      )}
      {voice.error && <p className="mt-1 px-1 text-xs text-red-600">{voice.error}</p>}
    </div>
  );

  return (
    <div
      className={
        isPanel
          ? "flex h-full w-full flex-col overflow-hidden bg-white"
          : "relative flex h-[calc(100vh-var(--assistant-chrome,7rem))] min-h-[520px] overflow-hidden bg-white"
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900">
          <Sparkles size={15} className="shrink-0 text-[#2f66ea]" />
          <span className="truncate">{headerTitle}</span>
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          {ownerType === "staff" && !isPanel && (
            <div className="mr-1">
              <FocusedPatientPicker value={focusedPatient} onChange={setFocus} />
            </div>
          )}
          <button
            onClick={newThread}
            aria-label="New chat"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <SquarePen size={15} />
          </button>
          {isPanel && onExpand && (
            <button
              onClick={onExpand}
              aria-label="Open full screen"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <Maximize2 size={14} />
            </button>
          )}
          {!isPanel && (
            <button
              onClick={() => setRailOpen((v) => !v)}
              aria-label={railOpen ? "Hide conversation list" : "Show conversation list"}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              {railOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
            </button>
          )}
          {isPanel && onClose && (
            <button
              onClick={onClose}
              aria-label="Close assistant"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {ownerType === "staff" && isPanel && (
        <div className="border-b border-slate-100 px-3 py-2">
          <FocusedPatientPicker value={focusedPatient} onChange={setFocus} />
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        {railOpen && rail}
        {isPanel && railOpen && (
          <button
            aria-label="Close conversation list"
            onClick={() => setRailOpen(false)}
            className="absolute inset-0 z-10 bg-slate-900/10"
          />
        )}
        {isPanel && !railOpen && (
          <button
            onClick={() => setRailOpen(true)}
            aria-label="Show conversation list"
            className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <PanelLeft size={15} />
          </button>
        )}

        {/* Chat column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-5 px-4 py-6">
              <div className="flex-1" />
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[#2f66ea] px-3.5 py-2 text-sm text-white">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
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
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.citedFiles.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => openPreview(f.id, f.fileName)}
                            disabled={previewingId === f.id}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[12px] font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                          >
                            {previewingId === f.id ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <FileText size={11} className="text-[#2f66ea]" />
                            )}
                            {f.fileName}
                          </button>
                        ))}
                      </div>
                    )}
                    {m.actions.map((a) => (
                      <div
                        key={a.id}
                        className={`mt-3 rounded-xl border px-3.5 py-3 text-sm ${
                          a.status === "done"
                            ? "border-green-200 bg-green-50/70"
                            : a.status === "failed"
                              ? "border-slate-200 bg-slate-50"
                              : "border-slate-200 bg-white shadow-sm"
                        }`}
                      >
                        <p className="flex items-start gap-1.5 text-slate-800">
                          {a.status === "done" ? (
                            <Check size={14} className="mt-0.5 shrink-0 text-green-600" />
                          ) : a.status === "failed" ? (
                            <CircleAlert size={14} className="mt-0.5 shrink-0 text-slate-400" />
                          ) : (
                            <Sparkles size={14} className="mt-0.5 shrink-0 text-[#2f66ea]" />
                          )}
                          {a.status === "done" ? a.result || a.summary : a.summary}
                        </p>
                        {a.status === "proposed" && (
                          <div className="mt-2.5 flex gap-2">
                            <button
                              onClick={() => resolveAction(m.id, a, false)}
                              disabled={confirmingId === a.id}
                              className="flex items-center gap-1 rounded-lg bg-[#2f66ea] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2554c7] disabled:bg-[#a8c0f5]"
                            >
                              {confirmingId === a.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Check size={12} />
                              )}
                              Confirm
                            </button>
                            <button
                              onClick={() => resolveAction(m.id, a, true)}
                              disabled={confirmingId === a.id}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
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
              {sending && !streaming && (
                <p className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 size={13} className="animate-spin" />
                  {workLabel ?? "Working"}…
                </p>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </div>

          {composer}
        </div>
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
