import { NextRequest, NextResponse } from "next/server";
import { DeepgramClient } from "@deepgram/sdk";
import { auth } from "@/lib/auth";
import { getDeepgramEnv, DeepgramNotConfiguredError } from "@/lib/env";

export const dynamic = "force-dynamic";

// A short visit recording (demo-scale, ~1-2 minutes of webm/opus) is a few hundred
// KB — well under any platform request-body ceiling, so no special config needed
// here. Longer real-world visits would want chunked/streamed upload instead.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.type !== "staff") {
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

  try {
    const deepgram = new DeepgramClient({ apiKey: env.DEEPGRAM_API_KEY });
    const response = await deepgram.listen.v1.media.transcribeFile(audioBuffer, {
      model: env.DEEPGRAM_MODEL,
      diarize: true,
      punctuate: true,
      smart_format: true,
      utterances: true,
    });

    if (!("results" in response)) {
      // Only happens for async/callback-style requests, which we never make here.
      return NextResponse.json({ error: "TranscriptionPending" }, { status: 502 });
    }

    const utterances = response.results.utterances ?? [];
    let transcript: string;

    if (utterances.length > 0) {
      transcript = utterances
        .map((u) => `Speaker ${u.speaker ?? "?"}: ${(u.transcript ?? "").trim()}`)
        .filter((line) => !line.endsWith(": "))
        .join("\n");
    } else {
      // Diarization/utterances can come back empty for very short or silent
      // clips — fall back to the plain flat transcript rather than an empty result.
      transcript = response.results.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
    }

    if (!transcript) {
      return NextResponse.json({ error: "EmptyTranscript" }, { status: 502 });
    }

    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("Transcription request failed:", err);
    return NextResponse.json({ error: "TranscriptionFailed" }, { status: 502 });
  }
}
