"use client";

import { useEffect, useRef, useState } from "react";

interface UseVoiceInputOptions {
  /** Called once the recording has been transcribed by the server. */
  onTranscript: (text: string, detectedLanguage: string | null) => void;
}

/**
 * Records a short clip from the microphone and sends it to /api/transcribe
 * (Deepgram Nova-3 multilingual). Unlike the browser's built-in SpeechRecognition
 * this is not locked to one language — Deepgram detects the spoken language and
 * handles code-switching, so no language picker is needed.
 */
export function useVoiceInput({ onTranscript }: UseVoiceInputOptions) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  async function transcribe() {
    setTranscribing(true);
    try {
      const mimeType = recorderRef.current?.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });

      const res = await fetch("/api/transcribe", {
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

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
      setError("Voice input isn't supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void transcribe();
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access was denied or unavailable.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return { supported, recording, transcribing, error, start, stop };
}
