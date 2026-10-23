import { NextResponse } from "next/server";
import { approveScriptSchema } from "@/lib/api/schemas";
import { requireProjectOwnership, requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  repairSceneManifest,
  sceneManifestSchema,
  validateSceneManifestConsistency,
} from "@/lib/schemas/scene-manifest";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const owned = await requireProjectOwnership(id, user!.id);
  if (owned.error) return owned.error;

  const body = await request.json().catch(() => null);
  const parsed = approveScriptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const manifestParsed = sceneManifestSchema.safeParse(parsed.data.scriptManifest);
  if (!manifestParsed.success) {
    return NextResponse.json(
      { error: "Invalid manifest", details: manifestParsed.error.flatten() },
      { status: 400 },
    );
  }

  const manifest = repairSceneManifest(manifestParsed.data);
  const consistency = validateSceneManifestConsistency(manifest, {
    targetDuration: owned.project!.targetDuration,
    language: owned.project!.language,
  });
  if (!consistency.ok) {
    return NextResponse.json({ error: "Manifest validation failed", details: consistency.errors }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.scene.deleteMany({ where: { projectId: id } });
    await tx.videoProject.update({
      where: { id },
      data: {
        title: manifest.title,
        scriptManifest: manifest,
        status: "DRAFT",
        errorMessage: null,
      },
    });
    await tx.scene.createMany({
      data: manifest.scenes.map((scene) => ({
        projectId: id,
        order: scene.order,
        sceneKey: scene.id,
        scriptSnippet: scene.scriptSnippet,
        visualKeywords: scene.visualKeywords,
        overlayText: scene.overlayText ?? null,
        transition: scene.transition,
        estimatedDuration: scene.estimatedDuration,
      })),
    });
  });

  const project = await prisma.videoProject.findUnique({
    where: { id },
    include: { scenes: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ project, scriptManifest: manifest });
}
