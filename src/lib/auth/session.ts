import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user: session.user, error: null };
}

export async function requireProjectOwnership(projectId: string, userId: string) {
  const { prisma } = await import("@/lib/db");
  const project = await prisma.videoProject.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) {
    return { project: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { project, error: null };
}
