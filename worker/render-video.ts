import path from "path";
import os from "os";
import fs from "fs/promises";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { RenderManifest } from "@/lib/video/render-manifest";

export async function renderProjectVideo(
  manifest: RenderManifest,
): Promise<{ outputPath: string; durationInSeconds: number }> {
  const entry = path.join(process.cwd(), "remotion/index.ts");
  const serveUrl = await bundle({
    entryPoint: entry,
    webpackOverride: (config) => config,
  });

  const inputProps = {
    title: manifest.title,
    audioUrl: manifest.audioUrl,
    subtitles: manifest.subtitles,
    scenes: manifest.scenes.map((s) => ({
      sceneKey: s.sceneKey,
      order: s.order,
      scriptSnippet: s.scriptSnippet,
      overlayText: s.overlayText,
      transition: s.transition,
      startTime: s.startTime,
      endTime: s.endTime,
      visualUrl: s.visualUrl,
      isVideo: s.isVideo,
    })),
  };

  const composition = await selectComposition({
    serveUrl,
    id: "MainVideo",
    inputProps,
  });

  const outputPath = path.join(
    os.tmpdir(),
    `shortcutvid-${Date.now()}.mp4`,
  );

  await renderMedia({
    composition: {
      ...composition,
      width: manifest.width,
      height: manifest.height,
      fps: manifest.fps,
    },
    serveUrl,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    timeoutInMilliseconds: Number(process.env.VIDEO_RENDER_TIMEOUT_MS ?? 600000),
  });

  return {
    outputPath,
    durationInSeconds: manifest.durationInSeconds,
  };
}
