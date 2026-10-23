export const VIDEO_PIPELINE_QUEUE = "video-pipeline";

export enum PipelineStep {
  SCRIPT_GENERATION = "SCRIPT_GENERATION",
  ASSET_SEARCH = "ASSET_SEARCH",
  ASSET_DOWNLOAD = "ASSET_DOWNLOAD",
  VOICEOVER_GENERATION = "VOICEOVER_GENERATION",
  SUBTITLE_ALIGNMENT = "SUBTITLE_ALIGNMENT",
  VIDEO_RENDERING = "VIDEO_RENDERING",
  STORAGE_UPLOAD = "STORAGE_UPLOAD",
  COMPLETED = "COMPLETED",
}

export const PIPELINE_STEP_ORDER: PipelineStep[] = [
  PipelineStep.ASSET_SEARCH,
  PipelineStep.ASSET_DOWNLOAD,
  PipelineStep.VOICEOVER_GENERATION,
  PipelineStep.SUBTITLE_ALIGNMENT,
  PipelineStep.VIDEO_RENDERING,
  PipelineStep.STORAGE_UPLOAD,
  PipelineStep.COMPLETED,
];

export type VideoPipelineJobData = {
  jobId: string;
  projectId: string;
  userId: string;
  idempotencyKey: string;
};
