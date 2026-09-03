import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";

let cached: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (cached) return cached;
  const env = getEnv();
  cached = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return cached;
}

export function getModel(): string {
  return getEnv().ANTHROPIC_MODEL;
}

export function getDocModel(): string {
  return getEnv().ANTHROPIC_DOC_MODEL;
}
