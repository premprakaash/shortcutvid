import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireProjectOwnership, requireUser } from "@/lib/auth/session";
import {
  getAvailableCredits,
  InsufficientCreditsError,
  reserveCredits,
} from "@/lib/credits/ledger";
import { prisma } from "@/lib/db";
import { enqueueVideoPipeline } from "@/lib/queue/client";

type Params = { params: Promise<{ id: string }> };

const GENERATION_CREDIT_COST = 1;

export async function POST(_request: Request, { params }: Params) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const owned = await requireProjectOwnership(id, user!.id);
  if (owned.error) return owned.error;

  const project = owned.project!;
  if (!project.scriptManifest) {
    return NextResponse.json(
      { error: "Approve a script before generating video." },
      { status: 400 },
    );
  }

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user!.id } });
  if (getAvailableCredits(dbUser) < GENERATION_CREDIT_COST) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  const activeJob = await prisma.generationJob.findFirst({
    where: {
      projectId: id,
      status: { in: ["QUEUED", "RUNNING"] },
    },
  });
  if (activeJob) {
    return NextResponse.json({ job: activeJob }, { status: 409 });
  }

  const idempotencyKey = `gen:${id}:${randomUUID()}`;

  try {
    await reserveCredits(user!.id, id, GENERATION_CREDIT_COST, idempotencyKey);
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }
    throw err;
  }

  const job = await prisma.generationJob.create({
    data: {
      userId: user!.id,
      projectId: id,
      jobType: "FULL_PIPELINE",
      status: "QUEUED",
      progress: 0,
      currentStep: "ASSET_SEARCH",
      idempotencyKey,
    },
  });

  await prisma.videoProject.update({
    where: { id },
    data: { status: "GENERATING_ASSETS", errorMessage: null },
  });

  await enqueueVideoPipeline({
    jobId: job.id,
    projectId: id,
    userId: user!.id,
    idempotencyKey,
  });

  return NextResponse.json({ job }, { status: 202 });
}
