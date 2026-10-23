"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type SceneManifest = {
  title: string;
  voiceoverFullText: string;
  scenes: Array<{
    id: string;
    order: number;
    scriptSnippet: string;
    overlayText?: string | null;
    visualKeywords: string[];
    estimatedDuration: number;
  }>;
};

type Project = {
  id: string;
  title: string;
  status: string;
  prompt: string;
  scriptManifest?: SceneManifest | null;
  renderedVideoUrl?: string | null;
  errorMessage?: string | null;
  generationJobs?: Array<{
    id: string;
    status: string;
    progress: number;
    currentStep?: string | null;
    errorMessage?: string | null;
  }>;
};

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<Project | null>(null);
  const [manifestText, setManifestText] = useState("");
  const [loadingScript, setLoadingScript] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) return;
    const data = await res.json();
    setProject(data.project);
    if (data.project.scriptManifest) {
      setManifestText(JSON.stringify(data.project.scriptManifest, null, 2));
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeJob = project?.generationJobs?.[0];
  const isGenerating = activeJob && ["QUEUED", "RUNNING"].includes(activeJob.status);

  useEffect(() => {
    if (!isGenerating) return;
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [isGenerating, load]);

  const videoSrc = useMemo(() => {
    if (!project?.renderedVideoUrl) return null;
    if (project.renderedVideoUrl.startsWith("/api/media/")) return project.renderedVideoUrl;
    return project.renderedVideoUrl;
  }, [project?.renderedVideoUrl]);

  async function generateScript() {
    setLoadingScript(true);
    const res = await fetch(`/api/projects/${projectId}/generate-script`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setLoadingScript(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Script generation failed");
      return;
    }
    toast.success("Script generated");
    await load();
  }

  async function approveScript() {
    let parsed: SceneManifest;
    try {
      parsed = JSON.parse(manifestText) as SceneManifest;
    } catch {
      toast.error("Script JSON is invalid");
      return;
    }
    const res = await fetch(`/api/projects/${projectId}/approve-script`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scriptManifest: parsed }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not approve script");
      return;
    }
    toast.success("Script approved");
    await load();
  }

  async function generateVideo() {
    setLoadingVideo(true);
    const res = await fetch(`/api/projects/${projectId}/generate-video`, {
      method: "POST",
    });
    setLoadingVideo(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not start generation");
      return;
    }
    toast.success("Video generation started");
    await load();
  }

  async function downloadVideo() {
    const res = await fetch(`/api/projects/${projectId}/download`);
    if (!res.ok) {
      toast.error("Download unavailable");
      return;
    }
    const data = await res.json();
    window.open(data.downloadUrl, "_blank");
  }

  if (!project) {
    return <div className="p-10 text-slate-400">Loading project...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm text-indigo-400 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-bold">{project.title}</h1>
          <p className="text-sm text-slate-400">Status: {project.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void generateScript()} disabled={loadingScript}>
            {loadingScript ? "Generating script..." : "Generate script"}
          </Button>
          <Button variant="secondary" onClick={() => void approveScript()}>
            Approve script
          </Button>
          <Button onClick={() => void generateVideo()} disabled={loadingVideo || !!isGenerating}>
            {loadingVideo ? "Starting..." : "Generate video"}
          </Button>
          {project.status === "COMPLETED" && (
            <Button variant="outline" onClick={() => void downloadVideo()}>
              Download MP4
            </Button>
          )}
        </div>
      </div>

      {project.errorMessage && (
        <Card className="border-red-900/50">
          <CardContent className="p-4 text-sm text-red-300">{project.errorMessage}</CardContent>
        </Card>
      )}

      {activeJob && (
        <Card>
          <CardHeader>
            <CardTitle>Generation progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm text-slate-400">
              <span>{activeJob.currentStep ?? activeJob.status}</span>
              <span>{activeJob.progress}%</span>
            </div>
            <Progress value={activeJob.progress} />
            {activeJob.errorMessage && (
              <p className="text-sm text-red-300">{activeJob.errorMessage}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Script manifest (editable JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={manifestText}
            onChange={(e) => setManifestText(e.target.value)}
            className="min-h-80 w-full rounded-md border border-slate-700 bg-slate-950 p-3 font-mono text-xs"
            placeholder="Generate a script to populate this editor..."
          />
        </CardContent>
      </Card>

      {videoSrc && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <video controls className="w-full max-w-md rounded-lg border border-slate-800" src={videoSrc} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Scene breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(project.scriptManifest?.scenes ?? []).map((scene) => (
            <div key={scene.id} className="rounded-lg border border-slate-800 p-4">
              <p className="text-xs uppercase text-slate-500">Scene {scene.order}</p>
              <p className="mt-1 font-medium">{scene.overlayText ?? scene.id}</p>
              <p className="mt-2 text-sm text-slate-300">{scene.scriptSnippet}</p>
              <p className="mt-2 text-xs text-slate-500">
                Visuals: {scene.visualKeywords.join(", ")} · ~{scene.estimatedDuration}s
              </p>
            </div>
          ))}
          {!project.scriptManifest?.scenes?.length && (
            <p className="text-sm text-slate-400">Generate and approve a script to see scenes.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
