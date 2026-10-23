import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  AUTH_SECRET: z.string().min(16),
  AUTH_TRUST_HOST: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  APP_URL: z.string().url().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().min(32).optional(),
  OPENAI_API_KEY: z.string().optional(),
  PEXELS_API_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("shortcutvid"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  LOCAL_STORAGE_PATH: z.string().default("./storage"),
  WORKER_CONCURRENCY: z.coerce.number().default(2),
  VIDEO_RENDER_TIMEOUT_MS: z.coerce.number().default(600_000),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(message)}`);
  }
  cached = parsed.data;
  return cached;
}

export function getAppUrl(): string {
  const env = getEnv();
  return env.APP_URL ?? env.NEXT_PUBLIC_APP_URL;
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function isPexelsConfigured(): boolean {
  return Boolean(process.env.PEXELS_API_KEY);
}

export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY &&
      process.env.S3_ENDPOINT,
  );
}
