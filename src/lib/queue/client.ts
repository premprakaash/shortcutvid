import { Queue } from "bullmq";
import IORedis from "ioredis";
import { getEnv } from "@/lib/env";
import { VIDEO_PIPELINE_QUEUE, type VideoPipelineJobData } from "./constants";

let connection: IORedis | null = null;
let queue: Queue<VideoPipelineJobData> | null = null;

function getConnection() {
  if (!connection) {
    const env = getEnv();
    connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}

export function getVideoPipelineQueue() {
  if (!queue) {
    queue = new Queue<VideoPipelineJobData>(VIDEO_PIPELINE_QUEUE, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return queue;
}

export async function enqueueVideoPipeline(data: VideoPipelineJobData) {
  const q = getVideoPipelineQueue();
  await q.add("generate-video", data, {
    jobId: data.idempotencyKey,
  });
}
