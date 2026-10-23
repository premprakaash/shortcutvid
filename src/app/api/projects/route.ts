import { NextResponse } from "next/server";
import { createProjectSchema } from "@/lib/api/schemas";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  const projects = await prisma.videoProject.findMany({
    where: { userId: user!.id },
    orderBy: { createdAt: "desc" },
    include: {
      generationJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const project = await prisma.videoProject.create({
    data: {
      userId: user!.id,
      title: parsed.data.title ?? "Untitled video",
      prompt: parsed.data.prompt,
      inputType: parsed.data.inputType,
      language: parsed.data.language,
      aspectRatio: parsed.data.aspectRatio,
      targetDuration: parsed.data.targetDuration,
      tone: parsed.data.tone,
      visualStyle: parsed.data.visualStyle,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
