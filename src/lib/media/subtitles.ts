import OpenAI from "openai";
import { isOpenAiConfigured } from "@/lib/env";

export type SubtitleCue = {
  text: string;
  start: number;
  end: number;
  words?: Array<{ text: string; start: number; end: number }>;
};

export async function alignSubtitlesFromAudio(
  audioBuffer: Buffer,
  fullText: string,
  totalDuration: number,
): Promise<SubtitleCue[]> {
  if (isOpenAiConfigured()) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const file = new File([Uint8Array.from(audioBuffer)], "voiceover.mp3", {
        type: "audio/mpeg",
      });
      const transcription = await client.audio.transcriptions.create({
        file,
        model: "whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["word"],
      });

      const words =
        (
          transcription as unknown as {
            words?: Array<{ word: string; start: number; end: number }>;
          }
        ).words ?? [];

      if (words.length > 0) {
        const cues: SubtitleCue[] = [];
        let chunk: typeof words = [];
        for (const w of words) {
          chunk.push(w);
          if (chunk.length >= 6 || /[.!?]$/.test(w.word)) {
            cues.push({
              text: chunk.map((c) => c.word).join(" "),
              start: chunk[0]!.start,
              end: chunk[chunk.length - 1]!.end,
              words: chunk.map((c) => ({
                text: c.word,
                start: c.start,
                end: c.end,
              })),
            });
            chunk = [];
          }
        }
        if (chunk.length) {
          cues.push({
            text: chunk.map((c) => c.word).join(" "),
            start: chunk[0]!.start,
            end: chunk[chunk.length - 1]!.end,
            words: chunk.map((c) => ({
              text: c.word,
              start: c.start,
              end: c.end,
            })),
          });
        }
        if (cues.length) return cues;
      }
    } catch {
      // fall through to phrase-level estimation
    }
  }

  return phraseLevelSubtitles(fullText, totalDuration);
}

export function phraseLevelSubtitles(
  fullText: string,
  totalDuration: number,
): SubtitleCue[] {
  const sentences = fullText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const totalChars = sentences.reduce((n, s) => n + s.length, 0) || 1;
  let cursor = 0;
  return sentences.map((sentence) => {
    const share = sentence.length / totalChars;
    const duration = totalDuration * share;
    const cue: SubtitleCue = {
      text: sentence,
      start: cursor,
      end: cursor + duration,
    };
    cursor += duration;
    return cue;
  });
}
