import OpenAI from "openai";
import {
  repairSceneManifest,
  sceneManifestSchema,
  validateSceneManifestConsistency,
  type SceneManifest,
} from "@/lib/schemas/scene-manifest";
import { isOpenAiConfigured } from "@/lib/env";

export type GenerateSceneManifestOptions = {
  targetDuration?: number;
  language?: string;
  audience?: string;
  tone?: string;
  contentCategory?: string;
  aspectRatio?: string;
  callToAction?: string;
  numberOfScenes?: number;
  platform?: string;
};

const openAiJsonSchema = {
  type: "object" as const,
  additionalProperties: false,
  required: [
    "title",
    "targetDuration",
    "language",
    "voiceoverFullText",
    "scenes",
  ],
  properties: {
    title: { type: "string" },
    targetDuration: { type: "integer" },
    language: { type: "string" },
    voiceoverFullText: { type: "string" },
    scenes: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "order",
          "scriptSnippet",
          "visualKeywords",
          "transition",
          "estimatedDuration",
        ],
        properties: {
          id: { type: "string" },
          order: { type: "integer" },
          scriptSnippet: { type: "string" },
          visualKeywords: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
          },
          overlayText: { type: "string" },
          transition: { type: "string", enum: ["cut", "fade", "slide"] },
          estimatedDuration: { type: "number" },
        },
      },
    },
  },
};

export async function generateSceneManifest(
  prompt: string,
  options: GenerateSceneManifestOptions = {},
): Promise<SceneManifest> {
  if (!isOpenAiConfigured()) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Add it to your environment to generate scripts.",
    );
  }

  const targetDuration = options.targetDuration ?? 50;
  const language = options.language ?? "en";
  const numberOfScenes = options.numberOfScenes ?? 6;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system = `You are an expert short-form video scriptwriter. Produce structured JSON for a ${targetDuration}s ${language} video.
Rules:
- Strong hook in scene 1, clear idea, concise explanations, natural transitions, satisfying conclusion.
- For ~50s English videos target 115-135 spoken words in voiceoverFullText.
- voiceoverFullText MUST equal scene scriptSnippet texts joined in order (single spaces).
- ${numberOfScenes} scenes with unique ids scene_1..scene_n, sequential order, positive estimatedDuration.
- Total estimatedDuration within ±6s of targetDuration.
- overlayText: short uppercase hook text per scene (optional), max 6 words.
- visualKeywords: 2-4 stock-footage search terms per scene.
- No fabricated facts, no repetitive filler, no "In this video" intros.`;

  const user = `Topic / idea:\n${prompt}\n\nOptions: ${JSON.stringify({
    ...options,
    targetDuration,
    language,
    numberOfScenes,
  })}`;

  let lastError: string | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            attempt === 0
              ? user
              : `${user}\n\nPrevious output failed validation: ${lastError}. Fix and return valid JSON only.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "scene_manifest",
          strict: true,
          schema: openAiJsonSchema,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      lastError = "Empty model response";
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      lastError = "Malformed JSON";
      continue;
    }

    const zodResult = sceneManifestSchema.safeParse(parsed);
    if (!zodResult.success) {
      lastError = zodResult.error.message;
      continue;
    }

    let manifest = repairSceneManifest(zodResult.data);
    const consistency = validateSceneManifestConsistency(manifest, {
      targetDuration,
      language,
    });
    if (!consistency.ok) {
      manifest = repairSceneManifest(manifest);
      const retryConsistency = validateSceneManifestConsistency(manifest, {
        targetDuration,
        language,
      });
      if (!retryConsistency.ok) {
        lastError = retryConsistency.errors.join("; ");
        continue;
      }
    }

    return manifest;
  }

  throw new Error(
    lastError
      ? `Script generation failed validation: ${lastError}`
      : "Script generation failed",
  );
}
