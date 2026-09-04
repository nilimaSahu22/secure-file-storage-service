"use client";

import { Mic, Square, X } from "lucide-react";
import { Orb, type AgentState } from "@/components/ui/orb";
import { LiveWaveform } from "@/components/ui/live-waveform";

interface OrbSessionProps {
  /** Mic is actively capturing audio. */
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
  /** Most recent user or assistant line, shown as a caption under the orb. */
  caption: string | null;
  onMicTap: () => void;
  onClose: () => void;
}

/**
 * Full-screen hands-free voice mode: a reactive orb + live mic waveform standing in
 * for the chat while it runs. The underlying text conversation (AssistantView's
 * `messages`/`send()`) keeps going untouched — this is just a different view onto it,
 * so closing it drops straight back into the same thread, fully caught up.
 */
export function OrbSession({
  recording,
  transcribing,
  sending,
  workLabel,
  speaking,
  voiceError,
  caption,
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
          : "Tap the mic to talk";

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
        {caption && (
          <p className="mt-1 max-w-md text-center text-[13px] leading-relaxed text-slate-400">{caption}</p>
        )}
        {voiceError && <p className="mt-2 text-center text-xs text-red-600">{voiceError}</p>}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-4 px-6 pb-10">
        <div className="h-12 w-full max-w-sm">
          <LiveWaveform
            active={recording}
            processing={transcribing || sending}
            barColor="#2f66ea"
            height={48}
          />
        </div>
        <button
          type="button"
          onClick={onMicTap}
          disabled={transcribing || sending}
          aria-label={recording ? "Stop listening" : "Start talking"}
          className={`flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-colors disabled:opacity-50 ${
            recording ? "bg-red-500 hover:bg-red-600" : "bg-[#2f66ea] hover:bg-[#2554c7]"
          }`}
        >
          {recording ? <Square size={22} className="fill-current" /> : <Mic size={24} />}
        </button>
      </div>
    </div>
  );
}
