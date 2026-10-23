import { NextResponse } from "next/server";
import { requireProjectOwnership, requireUser } from "@/lib/auth/session";
import { getSignedDownloadUrl } from "@/lib/storage/object-storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const owned = await requireProjectOwnership(id, user!.id);
  if (owned.error) return owned.error;

  const project = owned.project!;
  if (!project.renderedVideoUrl) {
    return NextResponse.json({ error: "Video not ready" }, { status: 404 });
  }

  const keyMatch = project.renderedVideoUrl.match(/projects\/[^/]+\/rendered\.mp4$/);
  const key = keyMatch?.[0] ?? `projects/${id}/rendered.mp4`;
  const url = await getSignedDownloadUrl(key, 3600);

  return NextResponse.json({ downloadUrl: url, expiresIn: 3600 });
}
