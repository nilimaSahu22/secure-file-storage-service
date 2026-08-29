"use client";

import { useEffect, useRef, useState } from "react";
import type { SpeechRecognitionLike } from "@/lib/speechRecognition";

interface UseSpeechRecognitionOptions {
  onFinalTranscript: (text: string) => void;
}

export function useSpeechRecognition({ onFinalTranscript }: UseSpeechRecognitionOptions) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    // window isn't available during SSR, so feature detection can only run
    // client-side after mount — this is the one-time sync-with-browser-API case.
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(!!SpeechRecognitionCtor);
  }, []);

  function start() {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setError("Voice input isn't supported in this browser.");
      return;
    }

    setError(null);
    setInterimTranscript("");
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          if (transcript.trim()) onFinalTranscript(transcript.trim());
        } else {
          interim += transcript;
        }
      }
      setInterimTranscript(interim);
    };
    recognition.onerror = (event) => {
      setError(event.error === "not-allowed" ? "Microphone access was denied." : "Voice input failed.");
      setListening(false);
      setInterimTranscript("");
    };
    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function stop() {
    recognitionRef.current?.stop();
    setListening(false);
    setInterimTranscript("");
  }

  return { supported, listening, interimTranscript, error, start, stop };
}
