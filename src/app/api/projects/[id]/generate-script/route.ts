import { NextResponse } from "next/server";
import { generateScriptSchema } from "@/lib/api/schemas";
import { generateSceneManifest } from "@/lib/ai/generate-scene-manifest";
import { requireProjectOwnership, requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const owned = await requireProjectOwnership(id, user!.id);
  if (owned.error) return owned.error;

  const body = await request.json().catch(() => ({}));
  const parsed = generateScriptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const project = owned.project!;
  await prisma.videoProject.update({
    where: { id },
    data: { status: "SCRIPTING" },
  });

  try {
    const manifest = await generateSceneManifest(project.prompt, {
      targetDuration: project.targetDuration,
      language: project.language,
      tone: parsed.data.tone ?? project.tone ?? undefined,
      audience: parsed.data.audience,
      contentCategory: parsed.data.contentCategory,
      aspectRatio: project.aspectRatio,
      callToAction: parsed.data.callToAction,
      numberOfScenes: parsed.data.numberOfScenes,
      platform: parsed.data.platform,
    });

    const updated = await prisma.videoProject.update({
      where: { id },
      data: {
        title: manifest.title,
        scriptManifest: manifest,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ project: updated, scriptManifest: manifest });
  } catch (err) {
    await prisma.videoProject.update({
      where: { id },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Script generation failed" },
      { status: 502 },
    );
  }
}
