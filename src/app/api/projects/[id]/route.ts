import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { updateProjectSchema } from "@/lib/api/schemas";
import { requireProjectOwnership, requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { sceneManifestSchema } from "@/lib/schemas/scene-manifest";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const owned = await requireProjectOwnership(id, user!.id);
  if (owned.error) return owned.error;

  const project = await prisma.videoProject.findUnique({
    where: { id },
    include: {
      scenes: { orderBy: { order: "asc" } },
      generationJobs: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  return NextResponse.json({ project });
}

export async function PATCH(request: Request, { params }: Params) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const owned = await requireProjectOwnership(id, user!.id);
  if (owned.error) return owned.error;

  const body = await request.json().catch(() => null);
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let scriptManifestJson: Prisma.InputJsonValue | undefined;
  if (parsed.data.scriptManifest) {
    const manifestParsed = sceneManifestSchema.safeParse(parsed.data.scriptManifest);
    if (!manifestParsed.success) {
      return NextResponse.json(
        { error: "Invalid script manifest", details: manifestParsed.error.flatten() },
        { status: 400 },
      );
    }
    scriptManifestJson = manifestParsed.data as Prisma.InputJsonValue;
  }

  const project = await prisma.videoProject.update({
    where: { id },
    data: {
      title: parsed.data.title,
      prompt: parsed.data.prompt,
      inputType: parsed.data.inputType,
      language: parsed.data.language,
      aspectRatio: parsed.data.aspectRatio,
      targetDuration: parsed.data.targetDuration,
      tone: parsed.data.tone,
      visualStyle: parsed.data.visualStyle,
      voiceId: parsed.data.voiceId,
      scriptManifest: scriptManifestJson,
    },
  });

  return NextResponse.json({ project });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const owned = await requireProjectOwnership(id, user!.id);
  if (owned.error) return owned.error;

  await prisma.videoProject.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
