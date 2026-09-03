import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-haiku-4-5-20251001"),
  // Model for document-heavy AI (uploaded-file intake checks, extraction). Defaults to
  // the same model as ANTHROPIC_MODEL; override with a stronger model for better accuracy.
  ANTHROPIC_DOC_MODEL: z.string().min(1).default("claude-haiku-4-5-20251001"),
  ADMIN_RESET_TOKEN: z.string().min(1),
});

let cached: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  cached = parsed.data;
  return cached;
}

const s3EnvSchema = z.object({
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),
});

export class S3NotConfiguredError extends Error {
  constructor() {
    super("File storage is not configured (missing AWS environment variables)");
    this.name = "S3NotConfiguredError";
  }
}

let cachedS3: z.infer<typeof s3EnvSchema> | null = null;

// Validated separately from getEnv() so the rest of the app keeps working
// before AWS credentials are configured — only file-storage code paths need this.
export function getS3Env() {
  if (cachedS3) return cachedS3;

  const parsed = s3EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid S3 environment variables:", parsed.error.flatten().fieldErrors);
    throw new S3NotConfiguredError();
  }

  cachedS3 = parsed.data;
  return cachedS3;
}

const deepgramEnvSchema = z.object({
  DEEPGRAM_API_KEY: z.string().min(1),
  // nova-3 supports multilingual transcription and code-switching (language: "multi").
  // Override to "nova-3-medical" for English-only visits with stronger clinical vocab.
  DEEPGRAM_MODEL: z.string().min(1).default("nova-3"),
  // Deepgram Aura voice used to speak the assistant's reply when a question was
  // asked by voice. Aura-1 English voice by default (widest account availability).
  DEEPGRAM_TTS_MODEL: z.string().min(1).default("aura-asteria-en"),
});

export class DeepgramNotConfiguredError extends Error {
  constructor() {
    super("Voice transcription is not configured (missing DEEPGRAM_API_KEY)");
    this.name = "DeepgramNotConfiguredError";
  }
}

let cachedDeepgram: z.infer<typeof deepgramEnvSchema> | null = null;

// Same lazy-validation pattern as getS3Env() — only the /api/transcribe path needs
// this, so the rest of the app keeps working before a Deepgram key is configured.
export function getDeepgramEnv() {
  if (cachedDeepgram) return cachedDeepgram;

  const parsed = deepgramEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid Deepgram environment variables:", parsed.error.flatten().fieldErrors);
    throw new DeepgramNotConfiguredError();
  }

  cachedDeepgram = parsed.data;
  return cachedDeepgram;
}
