import type { SceneManifest } from "@/lib/schemas/scene-manifest";

export type TimedScene = {
  sceneKey: string;
  order: number;
  startTime: number;
  endTime: number;
  duration: number;
};

export function calculateSceneTiming(
  manifest: SceneManifest,
  totalAudioDuration: number,
): TimedScene[] {
  const estimatedTotal = manifest.scenes.reduce(
    (sum, s) => sum + s.estimatedDuration,
    0,
  );
  const scale = totalAudioDuration / Math.max(estimatedTotal, 1);
  let cursor = 0;
  return manifest.scenes
    .sort((a, b) => a.order - b.order)
    .map((scene, index, arr) => {
      const raw = scene.estimatedDuration * scale;
      const duration =
        index === arr.length - 1 ? totalAudioDuration - cursor : raw;
      const startTime = cursor;
      const endTime = startTime + duration;
      cursor = endTime;
      return {
        sceneKey: scene.id,
        order: scene.order,
        startTime,
        endTime,
        duration,
      };
    });
}
