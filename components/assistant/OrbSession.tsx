"use client";

import { Mic, Square, X } from "lucide-react";
import { Orb, type AgentState } from "@/components/ui/orb";

interface OrbSessionProps {
  /** Mic is actively capturing audio (listening is fully autonomous — no tap needed). */
  recording: boolean;
  /** A captured clip is being transcribed server-side. */
  transcribing: boolean;
  /** The assistant is working on a reply (tool calls / streaming). */
  sending: boolean;
  /** Short label for what the assistant is doing right now, e.g. "Reading the chart". */
  workLabel: string | null;
  /** The assistant's spoken reply is currently playing. */
  speaking: boolean;
  voiceError: string | null;
  /**
   * Contextual override: stop early while listening, interrupt while the assistant is
   * talking, or manually restart if the hands-free loop ever stalls out.
   */
  onMicTap: () => void;
  onClose: () => void;
}

/**
 * Full-screen hands-free voice mode: just a reactive orb standing in for the chat while
 * it runs — listening starts the moment this opens and keeps looping turn after turn on
 * its own (see the silence-based auto-stop in useVoiceInput), no tapping required. The
 * generated reply text is intentionally not shown here; the underlying text conversation
 * (AssistantView's `messages`/`send()`) keeps running underneath and is what's visible
 * again the moment this closes.
 */
export function OrbSession({
  recording,
  transcribing,
  sending,
  workLabel,
  speaking,
  voiceError,
  onMicTap,
  onClose,
}: OrbSessionProps) {
  const agentState: AgentState = recording
    ? "listening"
    : transcribing || sending
      ? "thinking"
      : speaking
        ? "talking"
        : null;

  const statusLabel =
    agentState === "listening"
      ? "Listening…"
      : agentState === "thinking"
        ? (workLabel ?? "Thinking") + "…"
        : agentState === "talking"
          ? "Speaking…"
          : "Go ahead, say something";

  const busy = agentState === "thinking";
  const stoppable = agentState === "listening" || agentState === "talking";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex shrink-0 items-center justify-end px-4 py-3">
        <button
          onClick={onClose}
          aria-label="Close voice mode"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
        <div className="h-64 w-64 max-h-[40vh] max-w-[40vh] sm:h-80 sm:w-80 sm:max-h-[45vh] sm:max-w-[45vh]">
          <Orb agentState={agentState} colors={["#CADCFC", "#2f66ea"]} />
        </div>

        <p className="mt-4 min-h-[1.5em] max-w-md text-center text-sm font-medium text-slate-500">
          {statusLabel}
        </p>
        {voiceError && <p className="mt-2 text-center text-xs text-red-600">{voiceError}</p>}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-2 px-6 pb-10">
        <button
          type="button"
          onClick={onMicTap}
          disabled={busy}
          aria-label={stoppable ? "Stop" : "Start talking"}
          className={`flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-colors disabled:opacity-50 ${
            stoppable ? "bg-red-500 hover:bg-red-600" : "bg-[#2f66ea] hover:bg-[#2554c7]"
          }`}
        >
          {stoppable ? <Square size={22} className="fill-current" /> : <Mic size={24} />}
        </button>
      </div>
    </div>
  );
}
