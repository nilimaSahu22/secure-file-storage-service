import { NextRequest, NextResponse } from "next/server";
import { DeepgramClient } from "@deepgram/sdk";
import { auth } from "@/lib/auth";
import { getAnthropicClient, getModel } from "@/lib/ai/client";
import { getDeepgramEnv, DeepgramNotConfiguredError } from "@/lib/env";

export const dynamic = "force-dynamic";

type SpeakerRole = "Doctor" | "Patient";

// A short recording (demo-scale: a spoken question, or ~1-2 minutes of visit audio
// as webm/opus) is a few hundred KB at most — well under any platform request-body
// ceiling, so the raw body is read in one go here. Longer real-world visits would
// want chunked/streamed upload instead.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ask AI passes ?diarize=false — a single person asking a question, so speaker
  // separation and "Speaker N:" labels would just be noise. Visit recordings use
  // the default (diarize=true) to split the doctor and patient onto separate lines.
  const diarize = request.nextUrl.searchParams.get("diarize") !== "false";

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

  // "multi" turns on Nova-3 multilingual transcription, which follows the speaker's
  // language and mid-sentence code-switching (e.g. a clinician moving between Hindi
  // and English) without a language picker. English-only models (e.g. nova-3-medical,
  // *-en) reject language=multi with a 400, so fall back to "en" for those.
  const englishOnlyModel = /medical|(^|[-_])en([-_]|$)/i.test(env.DEEPGRAM_MODEL);
  try {
    const deepgram = new DeepgramClient({ apiKey: env.DEEPGRAM_API_KEY });
    const response = await deepgram.listen.v1.media.transcribeFile(audioBuffer, {
      model: env.DEEPGRAM_MODEL,
      language: englishOnlyModel ? "en" : "multi",
      diarize,
      punctuate: true,
      smart_format: true,
      utterances: diarize,
    });

    if (!("results" in response)) {
      // Only happens for async/callback-style requests, which we never make here.
      return NextResponse.json({ error: "TranscriptionPending" }, { status: 502 });
    }

    const channel = response.results.channels?.[0];
    const detectedLanguage = channel?.detected_language ?? null;
    const flatTranscript = channel?.alternatives?.[0]?.transcript?.trim() ?? "";

    if (!diarize) {
      if (!flatTranscript) {
        return NextResponse.json({ error: "EmptyTranscript" }, { status: 502 });
      }
      return NextResponse.json({ transcript: flatTranscript, detectedLanguage });
    }

    const utterances = response.results.utterances ?? [];
    const diarizedTranscript =
      utterances.length > 0
        ? utterances
            .map((u) => `Speaker ${u.speaker ?? "?"}: ${(u.transcript ?? "").trim()}`)
            .filter((line) => !line.endsWith(": "))
            .join("\n")
        : "";

    // Distinct speaker ids, in order of first appearance.
    const speakers = [
      ...new Set(utterances.map((u) => u.speaker).filter((s): s is number => s !== undefined)),
    ];

    if (speakers.length >= 2) {
      // Real two-voice audio: diarization split it. Ask the model which anonymous
      // speaker is the clinician vs the patient (who asks history/exam questions,
      // who describes symptoms) for the client's "who's who" picker default.
      const speakerRoles =
        speakers.length === 2 ? await inferSpeakerRoles(diarizedTranscript, speakers) : {};
      return NextResponse.json({
        transcript: diarizedTranscript,
        speakers,
        speakerRoles,
        detectedLanguage,
      });
    }

    // Only one voice was detected (e.g. a single mic, or one person voicing both
    // sides in a demo) — diarization can't help. Split the dialogue by meaning
    // instead: the model labels each turn Doctor:/Patient: from the content.
    if (!flatTranscript) {
      return NextResponse.json({ error: "EmptyTranscript" }, { status: 502 });
    }
    const segmentedTranscript = await segmentDialogue(flatTranscript);
    return NextResponse.json({
      transcript: segmentedTranscript,
      speakers: [],
      segmented: true,
      detectedLanguage,
    });
  } catch (err) {
    console.error("Transcription request failed:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "TranscriptionFailed", detail }, { status: 502 });
  }
}

async function segmentDialogue(flatTranscript: string): Promise<string> {
  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: getModel(),
      max_tokens: 2000,
      system:
        "You are given the raw transcript of a medical visit where speaker separation " +
        "failed, so it is one unbroken block of text. Rewrite it as a turn-by-turn " +
        "dialogue, starting each turn with 'Doctor:' or 'Patient:'. The doctor asks " +
        "about symptoms, history, and allergies and explains the assessment and plan; " +
        "the patient describes how they feel and answers. Keep the original wording and " +
        "the original language — only add the speaker labels and line breaks. If the " +
        "text is clearly not a two-person conversation, return it unchanged. Output only " +
        "the transcript, nothing else.",
      messages: [{ role: "user", content: flatTranscript }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const segmented = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    return segmented || flatTranscript;
  } catch (err) {
    console.error("Dialogue segmentation failed, returning flat transcript:", err);
    return flatTranscript;
  }
}

async function inferSpeakerRoles(
  transcript: string,
  speakers: number[]
): Promise<Record<number, SpeakerRole>> {
  // Best-effort default: whoever opens the visit is usually the clinician.
  const fallback: Record<number, SpeakerRole> = {};
  speakers.forEach((id, i) => {
    fallback[id] = i === 0 ? "Doctor" : "Patient";
  });

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: getModel(),
      max_tokens: 50,
      system:
        "You label speakers in a medical visit transcript. The clinician asks about " +
        "history and symptoms, performs the exam, and explains the assessment and plan. " +
        "The patient describes how they feel and answers questions. Respond with ONLY a " +
        'JSON object mapping each speaker number to "Doctor" or "Patient", e.g. ' +
        '{"0":"Patient","1":"Doctor"}. No other text.',
      messages: [{ role: "user", content: transcript }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const match = raw.match(/\{[^}]*\}/);
    if (!match) return fallback;

    const parsed = JSON.parse(match[0]) as Record<string, string>;
    const roles: Record<number, SpeakerRole> = {};
    for (const id of speakers) {
      const value = parsed[String(id)];
      roles[id] = value === "Doctor" ? "Doctor" : value === "Patient" ? "Patient" : fallback[id];
    }
    // Guard against the model assigning both speakers the same role.
    const distinct = new Set(Object.values(roles));
    return distinct.size === speakers.length ? roles : fallback;
  } catch (err) {
    console.error("Speaker role inference failed, using positional fallback:", err);
    return fallback;
  }
}
