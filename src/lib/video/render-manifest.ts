import { z } from "zod";
import { sceneManifestSchema } from "@/lib/schemas/scene-manifest";

export const renderSceneSchema = z.object({
  sceneKey: z.string(),
  order: z.number(),
  scriptSnippet: z.string(),
  overlayText: z.string().optional().nullable(),
  transition: z.string(),
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  visualUrl: z.string().min(1),
  isVideo: z.boolean().default(true),
});

export const renderManifestSchema = z.object({
  title: z.string(),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
  fps: z.number().default(30),
  width: z.number().positive(),
  height: z.number().positive(),
  durationInSeconds: z.number().positive(),
  audioUrl: z.string(),
  subtitles: z.array(
    z.object({
      text: z.string(),
      start: z.number(),
      end: z.number(),
    }),
  ),
  scenes: z.array(renderSceneSchema).min(1),
});

export type RenderManifest = z.infer<typeof renderManifestSchema>;

export function validateRenderManifest(input: unknown): RenderManifest {
  return renderManifestSchema.parse(input);
}

export function dimensionsForAspectRatio(aspectRatio: string): {
  width: number;
  height: number;
} {
  switch (aspectRatio) {
    case "16:9":
      return { width: 1920, height: 1080 };
    case "1:1":
      return { width: 1080, height: 1080 };
    case "9:16":
    default:
      return { width: 1080, height: 1920 };
  }
}

export function buildRenderManifestInput(
  project: {
    title: string;
    aspectRatio: string;
    scriptManifest: unknown;
    audioUrl: string;
  },
  scenes: Array<{
    sceneKey: string;
    order: number;
    scriptSnippet: string;
    overlayText: string | null;
    transition: string;
    startTime: number | null;
    endTime: number | null;
    visualAssetUrl: string | null;
    visualMetadata: unknown;
  }>,
  subtitles: Array<{ text: string; start: number; end: number }>,
  durationInSeconds: number,
): RenderManifest {
  const manifest = sceneManifestSchema.parse(project.scriptManifest);
  const { width, height } = dimensionsForAspectRatio(project.aspectRatio);

  const renderScenes = scenes.map((scene) => {
    if (!scene.visualAssetUrl) {
      throw new Error(`Missing visual for scene ${scene.sceneKey}`);
    }
    const meta = scene.visualMetadata as { isVideo?: boolean } | null;
    return {
      sceneKey: scene.sceneKey,
      order: scene.order,
      scriptSnippet: scene.scriptSnippet,
      overlayText: scene.overlayText,
      transition: scene.transition,
      startTime: scene.startTime ?? 0,
      endTime: scene.endTime ?? durationInSeconds,
      visualUrl: scene.visualAssetUrl,
      isVideo: meta?.isVideo ?? true,
    };
  });

  return validateRenderManifest({
    title: manifest.title || project.title,
    aspectRatio: project.aspectRatio as "9:16" | "16:9" | "1:1",
    fps: 30,
    width,
    height,
    durationInSeconds,
    audioUrl: project.audioUrl,
    subtitles,
    scenes: renderScenes,
  });
}
