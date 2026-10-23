import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import {
  VIDEO_PIPELINE_QUEUE,
  type VideoPipelineJobData,
} from "@/lib/queue/constants";
import { runVideoPipeline } from "./pipeline";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 2);

const worker = new Worker<VideoPipelineJobData>(
  VIDEO_PIPELINE_QUEUE,
  async (job) => {
    await runVideoPipeline(job.data);
  },
  { connection, concurrency },
);

worker.on("completed", (job) => {
  console.log(`[worker] completed job ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] failed job ${job?.id}:`, err);
});

async function shutdown() {
  console.log("[worker] shutting down...");
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`[worker] listening on ${VIDEO_PIPELINE_QUEUE} (concurrency=${concurrency})`);
