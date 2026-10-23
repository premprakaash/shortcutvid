import fs from "fs/promises";
import os from "os";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sceneManifestSchema } from "@/lib/schemas/scene-manifest";
import { searchPexelsVideos, downloadAllowedMedia } from "@/lib/media/pexels";
import { generateVoiceover } from "@/lib/media/voiceover";
import { alignSubtitlesFromAudio } from "@/lib/media/subtitles";
import { uploadObject } from "@/lib/storage/object-storage";
import { calculateSceneTiming } from "@/lib/video/scene-timing";
import { buildRenderManifestInput } from "@/lib/video/render-manifest";
import { resolveMediaUrlForWorker } from "@/lib/storage/resolve-media-url";
import { PipelineStep } from "@/lib/queue/constants";
import {
  finalizeCreditCharge,
  refundCredits,
} from "@/lib/credits/ledger";
import { renderProjectVideo } from "./render-video";
import { getMediaDurationSeconds } from "./ffprobe";

const GENERATION_CREDIT_COST = 1;

async function updateJob(
  jobId: string,
  data: {
    progress?: number;
    currentStep?: string;
    status?: "RUNNING" | "COMPLETED" | "FAILED";
    errorMessage?: string | null;
    startedAt?: Date;
    completedAt?: Date;
  },
) {
  await prisma.generationJob.update({ where: { id: jobId }, data });
}

function placeholderImageBuffer(): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#6366f1"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  return Buffer.from(svg);
}

export async function runVideoPipeline(input: {
  jobId: string;
  projectId: string;
  userId: string;
  idempotencyKey: string;
}) {
  const { jobId, projectId, userId, idempotencyKey } = input;

  await updateJob(jobId, {
    status: "RUNNING",
    startedAt: new Date(),
    progress: 5,
    currentStep: PipelineStep.ASSET_SEARCH,
  });

  try {
    const project = await prisma.videoProject.findUniqueOrThrow({
      where: { id: projectId },
      include: { scenes: { orderBy: { order: "asc" } } },
    });

    const manifest = sceneManifestSchema.parse(project.scriptManifest);
    const preferVertical = project.aspectRatio === "9:16" || project.aspectRatio === "1:1";

    await updateJob(jobId, {
      progress: 15,
      currentStep: PipelineStep.ASSET_SEARCH,
    });

    for (const scene of project.scenes) {
      const keywords = scene.visualKeywords.length
        ? scene.visualKeywords
        : ["abstract background"];
      let selectedUrl: string | null = null;
      let isVideo = true;
      let metadata: Prisma.InputJsonValue = {};

      try {
        const results = await searchPexelsVideos(keywords, { preferVertical });
        if (results[0]) {
          selectedUrl = results[0].url;
          metadata = {
            isVideo: true,
            pexelsId: results[0].id,
            photographer: results[0].photographer,
            sourceUrl: results[0].sourceUrl,
          };
        }
      } catch {
        // fallback below
      }

      await updateJob(jobId, {
        progress: 25,
        currentStep: PipelineStep.ASSET_DOWNLOAD,
      });

      const assetKey = `projects/${projectId}/scenes/${scene.sceneKey}`;
      if (selectedUrl) {
        const bytes = await downloadAllowedMedia(selectedUrl);
        const ext = selectedUrl.includes(".mp4") ? "mp4" : "mp4";
        const storageKey = `${assetKey}.${ext}`;
        const storedUrl = await uploadObject(storageKey, bytes, "video/mp4");
        await prisma.scene.update({
          where: { id: scene.id },
          data: {
            visualAssetUrl: storedUrl,
            visualMetadata: metadata,
          },
        });
      } else {
        isVideo = false;
        const storageKey = `${assetKey}.svg`;
        const storedUrl = await uploadObject(
          storageKey,
          placeholderImageBuffer(),
          "image/svg+xml",
        );
        await prisma.scene.update({
          where: { id: scene.id },
          data: {
            visualAssetUrl: storedUrl,
            visualMetadata: { isVideo: false, fallback: true },
          },
        });
      }
      void isVideo;
    }

    await prisma.videoProject.update({
      where: { id: projectId },
      data: { status: "GENERATING_AUDIO" },
    });
    await updateJob(jobId, {
      progress: 40,
      currentStep: PipelineStep.VOICEOVER_GENERATION,
    });

    const voice = await generateVoiceover(manifest.voiceoverFullText, {
      voice: (project.voiceId as "nova") ?? "nova",
    });
    const audioKey = `projects/${projectId}/voiceover.mp3`;
    const audioUrl = await uploadObject(audioKey, voice.audio, voice.contentType);

    const tmpAudio = path.join(os.tmpdir(), `${projectId}-voice.mp3`);
    await fs.writeFile(tmpAudio, voice.audio);
    const measuredDuration =
      (await getMediaDurationSeconds(tmpAudio)) || voice.durationEstimate;

    await prisma.videoProject.update({
      where: { id: projectId },
      data: { audioUrl },
    });

    await updateJob(jobId, {
      progress: 55,
      currentStep: PipelineStep.SUBTITLE_ALIGNMENT,
    });

    const subtitles = await alignSubtitlesFromAudio(
      voice.audio,
      manifest.voiceoverFullText,
      measuredDuration,
    );

    const timing = calculateSceneTiming(manifest, measuredDuration);
    for (const t of timing) {
      const scene = project.scenes.find((s) => s.sceneKey === t.sceneKey);
      if (!scene) continue;
      const sceneSubs = subtitles.filter(
        (sub) => sub.start >= t.startTime && sub.end <= t.endTime + 0.05,
      );
      await prisma.scene.update({
        where: { id: scene.id },
        data: {
          startTime: t.startTime,
          endTime: t.endTime,
          subtitleData: sceneSubs,
        },
      });
    }

    await prisma.videoProject.update({
      where: { id: projectId },
      data: { status: "RENDERING" },
    });
    await updateJob(jobId, {
      progress: 70,
      currentStep: PipelineStep.VIDEO_RENDERING,
    });

    const refreshed = await prisma.videoProject.findUniqueOrThrow({
      where: { id: projectId },
      include: { scenes: { orderBy: { order: "asc" } } },
    });

    const scenesForRender = refreshed.scenes.map((scene) => ({
      ...scene,
      visualAssetUrl: scene.visualAssetUrl
        ? resolveMediaUrlForWorker(scene.visualAssetUrl)
        : null,
    }));

    const renderManifest = buildRenderManifestInput(
      {
        title: refreshed.title,
        aspectRatio: refreshed.aspectRatio,
        scriptManifest: manifest,
        audioUrl: resolveMediaUrlForWorker(audioUrl),
      },
      scenesForRender,
      subtitles,
      measuredDuration,
    );

    const { outputPath } = await renderProjectVideo(renderManifest);

    await updateJob(jobId, {
      progress: 90,
      currentStep: PipelineStep.STORAGE_UPLOAD,
    });

    const videoBytes = await fs.readFile(outputPath);
    const renderedKey = `projects/${projectId}/rendered.mp4`;
    const renderedVideoUrl = await uploadObject(
      renderedKey,
      videoBytes,
      "video/mp4",
    );

    await prisma.videoProject.update({
      where: { id: projectId },
      data: {
        status: "COMPLETED",
        renderedVideoUrl,
        actualDuration: measuredDuration,
        errorMessage: null,
      },
    });

    await finalizeCreditCharge(userId, projectId, idempotencyKey);

    await updateJob(jobId, {
      status: "COMPLETED",
      progress: 100,
      currentStep: PipelineStep.COMPLETED,
      completedAt: new Date(),
      errorMessage: null,
    });

    await fs.unlink(outputPath).catch(() => undefined);
    await fs.unlink(tmpAudio).catch(() => undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.videoProject.update({
      where: { id: projectId },
      data: { status: "FAILED", errorMessage: message },
    });
    await updateJob(jobId, {
      status: "FAILED",
      errorMessage: message,
      completedAt: new Date(),
    });
    await refundCredits(
      userId,
      projectId,
      GENERATION_CREDIT_COST,
      idempotencyKey,
    );
    throw error;
  }
}
