import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { enqueueVideoPipeline } from "@/lib/queue/client";

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
  if (job.status !== "FAILED") {
    return NextResponse.json({ error: "Only failed jobs can be retried" }, { status: 400 });
  }
  if (!job.idempotencyKey) {
    return NextResponse.json({ error: "Missing idempotency key" }, { status: 400 });
  }

  const updated = await prisma.generationJob.update({
    where: { id },
    data: {
      status: "QUEUED",
      progress: 0,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    },
  });

  await enqueueVideoPipeline({
    jobId: updated.id,
    projectId: updated.projectId,
    userId: updated.userId,
    idempotencyKey: `${job.idempotencyKey}:retry:${Date.now()}`,
  });

  return NextResponse.json({ job: updated });
}
