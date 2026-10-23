import { z } from "zod";

export const sceneSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  scriptSnippet: z.string().min(1),
  visualKeywords: z.array(z.string().min(1)).min(1),
  overlayText: z.string().max(80).optional().nullable(),
  transition: z.enum(["cut", "fade", "slide"]).default("cut"),
  estimatedDuration: z.number().positive(),
});

export const sceneManifestSchema = z.object({
  title: z.string().min(3).max(120),
  targetDuration: z.number().int().positive(),
  language: z.string().min(2).max(10),
  voiceoverFullText: z.string().min(20),
  scenes: z.array(sceneSchema).min(2),
});

export type SceneManifest = z.infer<typeof sceneManifestSchema>;
export type SceneManifestScene = z.infer<typeof sceneSchema>;

export const DURATION_TOLERANCE_SECONDS = 8;
export const ENGLISH_WORD_COUNT_MIN = 95;
export const ENGLISH_WORD_COUNT_MAX = 150;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function validateSceneManifestConsistency(
  manifest: SceneManifest,
  options?: { targetDuration?: number; language?: string },
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const ids = new Set<string>();
  const orders = manifest.scenes.map((s) => s.order).sort((a, b) => a - b);
  for (const scene of manifest.scenes) {
    if (ids.has(scene.id)) errors.push(`Duplicate scene id: ${scene.id}`);
    ids.add(scene.id);
  }
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i + 1) {
      errors.push("Scene order must be sequential starting at 1");
      break;
    }
  }

  const joined = manifest.scenes
    .sort((a, b) => a.order - b.order)
    .map((s) => s.scriptSnippet.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const full = manifest.voiceoverFullText.replace(/\s+/g, " ").trim();
  if (joined !== full) {
    errors.push("voiceoverFullText must match concatenated scene narration");
  }

  const totalDuration = manifest.scenes.reduce(
    (sum, s) => sum + s.estimatedDuration,
    0,
  );
  const target = options?.targetDuration ?? manifest.targetDuration;
  if (Math.abs(totalDuration - target) > DURATION_TOLERANCE_SECONDS) {
    errors.push(
      `Total scene duration (${totalDuration}s) differs from target (${target}s) beyond tolerance`,
    );
  }

  const language = options?.language ?? manifest.language;
  if (language.startsWith("en")) {
    const words = countWords(full);
    if (words < ENGLISH_WORD_COUNT_MIN || words > ENGLISH_WORD_COUNT_MAX) {
      errors.push(
        `English narration word count ${words} outside ${ENGLISH_WORD_COUNT_MIN}-${ENGLISH_WORD_COUNT_MAX}`,
      );
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true };
}

export function repairSceneManifest(manifest: SceneManifest): SceneManifest {
  const scenes = [...manifest.scenes]
    .sort((a, b) => a.order - b.order)
    .map((scene, index) => ({
      ...scene,
      order: index + 1,
      id: scene.id || `scene_${index + 1}`,
      overlayText: scene.overlayText?.slice(0, 80) ?? undefined,
    }));
  const voiceoverFullText = scenes.map((s) => s.scriptSnippet.trim()).join(" ");
  return {
    ...manifest,
    voiceoverFullText,
    scenes,
  };
}
