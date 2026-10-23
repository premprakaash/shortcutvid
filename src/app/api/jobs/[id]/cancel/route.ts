import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getVideoPipelineQueue } from "@/lib/queue/client";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const job = await prisma.generationJob.findFirst({
    where: { id, userId: user!.id },
  });
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!["QUEUED", "RUNNING"].includes(job.status)) {
    return NextResponse.json({ error: "Job cannot be cancelled" }, { status: 400 });
  }

  if (job.idempotencyKey) {
    const queue = getVideoPipelineQueue();
    const bullJob = await queue.getJob(job.idempotencyKey);
    if (bullJob) await bullJob.remove();
  }

  const updated = await prisma.generationJob.update({
    where: { id },
    data: { status: "CANCELLED", completedAt: new Date() },
  });

  return NextResponse.json({ job: updated });
}
