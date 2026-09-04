"use client";

import { useEffect, useRef, useState } from "react";

interface UseVoiceInputOptions {
  /** Called once the recording has been transcribed by the server. */
  onTranscript: (text: string, detectedLanguage: string | null) => void;
}

/** Energy-based voice-activity-detection tuning for hands-free (auto-stop) recording. */
export interface AutoStopOptions {
  /** Stop once this many ms pass under `threshold`, once speech has been heard. Default 1100. */
  silenceMs?: number;
  /** Minimum ms of detected speech before silence is allowed to end the turn (ignores blips). Default 250. */
  minSpeechMs?: number;
  /** 0..1 energy level above which audio counts as speech. Default 0.045. */
  threshold?: number;
  /** Hard cap so a stuck-open mic (e.g. constant background noise) can't record forever. Default 20000. */
  maxDurationMs?: number;
}

const AUTO_STOP_DEFAULTS: Required<AutoStopOptions> = {
  silenceMs: 1100,
  minSpeechMs: 250,
  threshold: 0.045,
  maxDurationMs: 20000,
};

/**
 * Records a clip from the microphone and sends it to /api/transcribe (Deepgram Nova-3
 * multilingual). Unlike the browser's built-in SpeechRecognition this is not locked to
 * one language — Deepgram detects the spoken language and handles code-switching, so no
 * language picker is needed.
 *
 * `start()` takes an optional `AutoStopOptions`: pass it to auto-stop the recording once
 * the speaker goes quiet (simple energy-based VAD — see `attachAutoStop` below), for
 * hands-free flows. Omit it (as the composer's push-to-talk mic button does) for the
 * normal manual start/stop behaviour.
 */
export function useVoiceInput({ onTranscript }: UseVoiceInputOptions) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const vadRef = useRef<{
    ctx: AudioContext;
    analyser: AnalyserNode;
    source: MediaStreamAudioSourceNode;
    rafId: number;
  } | null>(null);

  useEffect(() => {
    // Feature detection can only run client-side after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof window !== "undefined" &&
        typeof window.MediaRecorder !== "undefined"
    );
  }, []);

  function teardownVad() {
    const vad = vadRef.current;
    if (!vad) return;
    cancelAnimationFrame(vad.rafId);
    try {
      vad.source.disconnect();
    } catch {
      /* already disconnected */
    }
    if (vad.ctx.state !== "closed") void vad.ctx.close().catch(() => {});
    vadRef.current = null;
  }

  /**
   * Simple energy-based VAD: sample the analyser's frequency data every animation
   * frame, average the speech-relevant band into a 0..1 level, and once the speaker
   * has been heard for `minSpeechMs` and then gone quiet for `silenceMs`, stop the
   * recording for them. This is the same amplitude-threshold idea browsers' own
   * SpeechRecognition "end of speech" detection uses — a full ML VAD (Silero, WebRTC's)
   * would hold up better in noisy rooms, but is overkill for a hands-free chat mic.
   */
  function attachAutoStop(stream: MediaStream, opts: Required<AutoStopOptions>) {
    try {
      const Ctx: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const startedAt = performance.now();
      let speechStartedAt: number | null = null;
      let lastLoudAt = performance.now();

      const tick = () => {
        analyser.getByteFrequencyData(data);
        // Same band the LiveWaveform visualizer reads — skips sub-bass rumble and hiss.
        const from = Math.floor(data.length * 0.05);
        const to = Math.floor(data.length * 0.5);
        let sum = 0;
        for (let i = from; i < to; i++) sum += data[i];
        const level = sum / (to - from) / 255;

        const now = performance.now();
        if (level > opts.threshold) {
          lastLoudAt = now;
          if (speechStartedAt === null) speechStartedAt = now;
        }

        const spokeLongEnough = speechStartedAt !== null && now - speechStartedAt >= opts.minSpeechMs;
        const silentFor = now - lastLoudAt;
        const timedOut = now - startedAt >= opts.maxDurationMs;

        if ((spokeLongEnough && silentFor >= opts.silenceMs) || timedOut) {
          stop();
          return;
        }
        if (vadRef.current) vadRef.current.rafId = requestAnimationFrame(tick);
      };

      vadRef.current = { ctx, analyser, source, rafId: requestAnimationFrame(tick) };
    } catch {
      // VAD setup failing just means the caller has to stop the recording manually —
      // recording itself still works.
    }
  }

  async function transcribe() {
    setTranscribing(true);
    try {
      const mimeType = recorderRef.current?.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });

      // diarize=false: one person asking a question — no speaker separation or
      // "Speaker N:" labels, just the plain spoken text.
      const res = await fetch("/api/transcribe?diarize=false", {
        method: "POST",
        headers: { "Content-Type": mimeType },
        body: blob,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          res.status === 503
            ? "Voice input isn't configured yet."
            : (data?.error ?? "Could not transcribe your recording.")
        );
        return;
      }

      const data = await res.json();
      const text = typeof data.transcript === "string" ? data.transcript.trim() : "";
      if (text) onTranscript(text, data.detectedLanguage ?? null);
    } catch {
      setError("Could not transcribe your recording. Please try again.");
    } finally {
      setTranscribing(false);
    }
  }

  async function start(autoStop?: AutoStopOptions) {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
      setError("Voice input isn't supported in this browser.");
      return;
    }
    if (recorderRef.current && recording) return; // already recording

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        teardownVad();
        void transcribe();
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);

      if (autoStop) {
        attachAutoStop(stream, { ...AUTO_STOP_DEFAULTS, ...autoStop });
      }
    } catch {
      setError("Microphone access was denied or unavailable.");
    }
  }

  function stop() {
    teardownVad();
    recorderRef.current?.stop();
    setRecording(false);
  }

  useEffect(() => {
    // Unmount safety net only — start()/stop() handle the normal lifecycle.
    return () => {
      teardownVad();
      recorderRef.current?.stop();
    };
  }, []);

  return { supported, recording, transcribing, error, start, stop };
}
