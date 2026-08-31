import { NextRequest, NextResponse } from "next/server";
import { DeepgramClient } from "@deepgram/sdk";
import { auth } from "@/lib/auth";
import { getDeepgramEnv, DeepgramNotConfiguredError } from "@/lib/env";

export const dynamic = "force-dynamic";

// A short recording (demo-scale: a spoken question, or ~1-2 minutes of visit audio
// as webm/opus) is a few hundred KB at most — well under any platform request-body
// ceiling, so the raw body is read in one go here. Longer real-world visits would
// want chunked/streamed upload instead.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const audioBuffer = Buffer.from(await request.arrayBuffer());
  if (audioBuffer.length === 0) {
    return NextResponse.json({ error: "No audio received" }, { status: 400 });
  }

  let env;
  try {
    env = getDeepgramEnv();
  } catch (err) {
    if (err instanceof DeepgramNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    throw err;
  }

  // "diarize" enables speaker separation (visit recordings); harmless for a single
  // speaker asking a question. "multi" turns on Nova-3 multilingual transcription,
  // which follows the speaker's language and mid-sentence code-switching (e.g. a
  // clinician moving between Hindi and English) without a language picker.
  try {
    const deepgram = new DeepgramClient({ apiKey: env.DEEPGRAM_API_KEY });
    const response = await deepgram.listen.v1.media.transcribeFile(audioBuffer, {
      model: env.DEEPGRAM_MODEL,
      language: "multi",
      diarize: true,
      punctuate: true,
      smart_format: true,
      utterances: true,
    });

    if (!("results" in response)) {
      // Only happens for async/callback-style requests, which we never make here.
      return NextResponse.json({ error: "TranscriptionPending" }, { status: 502 });
    }

    const channel = response.results.channels?.[0];
    const detectedLanguage = channel?.detected_language ?? null;
    const utterances = response.results.utterances ?? [];
    let transcript: string;
    let speakers: number[] = [];

    if (utterances.length > 0) {
      transcript = utterances
        .map((u) => `Speaker ${u.speaker ?? "?"}: ${(u.transcript ?? "").trim()}`)
        .filter((line) => !line.endsWith(": "))
        .join("\n");

      // Distinct speaker ids, in order of first appearance — lets the client offer
      // a "who's who" picker only when diarization actually separated two voices.
      speakers = [...new Set(utterances.map((u) => u.speaker).filter((s): s is number => s !== undefined))];
    } else {
      // Diarization/utterances can come back empty for very short or silent
      // clips (a one-line spoken question) — fall back to the flat transcript.
      transcript = channel?.alternatives?.[0]?.transcript?.trim() ?? "";
    }

    if (!transcript) {
      return NextResponse.json({ error: "EmptyTranscript" }, { status: 502 });
    }

    return NextResponse.json({ transcript, speakers, detectedLanguage });
  } catch (err) {
    console.error("Transcription request failed:", err);
    return NextResponse.json({ error: "TranscriptionFailed" }, { status: 502 });
  }
}
