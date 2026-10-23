"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Project = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  renderedVideoUrl?: string | null;
  generationJobs?: Array<{ id: string; status: string; progress: number }>;
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [credits, setCredits] = useState<{ available: number; used: number; total: number } | null>(
    null,
  );

  useEffect(() => {
    void (async () => {
      const [projectsRes, meRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/me"),
      ]);
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.projects ?? []);
      }
      if (meRes.ok) {
        const data = await meRes.json();
        setCredits(data.credits);
      }
    })();
  }, []);

  const completed = projects.filter((p) => p.status === "COMPLETED").length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-400">Welcome back, {session?.user?.name ?? session?.user?.email}</p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/projects/new">New video</Link>
          </Button>
          <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </Button>
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{projects.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed videos</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{completed}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Credits remaining</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {credits?.available ?? "—"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {projects.length === 0 && (
            <p className="text-sm text-slate-400">
              No projects yet.{" "}
              <Link href="/projects/new" className="text-indigo-400 hover:underline">
                Create your first video
              </Link>
            </p>
          )}
          {projects.slice(0, 8).map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-800 px-4 py-3 hover:bg-slate-900/60"
            >
              <div>
                <p className="font-medium">{project.title}</p>
                <p className="text-xs text-slate-500">{project.status}</p>
              </div>
              {project.generationJobs?.[0] && (
                <span className="text-xs text-slate-400">
                  Job {project.generationJobs[0].progress}%
                </span>
              )}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
