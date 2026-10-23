import OpenAI from "openai";
import { isOpenAiConfigured } from "@/lib/env";

export type VoiceoverOptions = {
  provider?: "openai";
  voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  language?: string;
  speed?: number;
  format?: "mp3" | "wav";
};

export async function generateVoiceover(
  text: string,
  voiceOptions: VoiceoverOptions = {},
): Promise<{ audio: Buffer; contentType: string; durationEstimate: number }> {
  if (!isOpenAiConfigured()) {
    throw new Error("OPENAI_API_KEY is required for voiceover generation.");
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const voice = voiceOptions.voice ?? "nova";
  const format = voiceOptions.format ?? "mp3";
  const speed = voiceOptions.speed ?? 1;

  const response = await client.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice,
    input: text,
    speed,
    response_format: format,
  });

  const arrayBuffer = await response.arrayBuffer();
  const audio = Buffer.from(arrayBuffer);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const durationEstimate = words / 2.5 / Math.max(speed, 0.5);

  return {
    audio,
    contentType: format === "wav" ? "audio/wav" : "audio/mpeg",
    durationEstimate,
  };
}
