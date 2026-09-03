import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDeepgramEnv, DeepgramNotConfiguredError } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Deepgram /v1/speak accepts up to 2000 characters per request.
const MAX_CHARS = 1800;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_CHARS) : "";
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

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
    const dg = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(env.DEEPGRAM_TTS_MODEL)}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text }),
    });

    if (!dg.ok) {
      const detail = await dg.text().catch(() => "");
      console.error("Deepgram TTS failed:", dg.status, detail);
      return NextResponse.json({ error: "TtsFailed" }, { status: 502 });
    }

    const audio = await dg.arrayBuffer();
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Speak request failed:", err);
    return NextResponse.json({ error: "TtsFailed" }, { status: 502 });
  }
}
