"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title") || "Untitled video"),
      prompt: String(form.get("prompt")),
      language: String(form.get("language") || "en"),
      aspectRatio: String(form.get("aspectRatio") || "9:16"),
      targetDuration: Number(form.get("targetDuration") || 50),
      tone: String(form.get("tone") || ""),
    };

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Could not create project");
      return;
    }
    const data = await res.json();
    router.push(`/projects/${data.project.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create a video project</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="My launch teaser" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">Idea or topic</Label>
              <textarea
                id="prompt"
                name="prompt"
                required
                minLength={10}
                className="min-h-32 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                placeholder="Explain why async job queues matter for video SaaS..."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Input id="language" name="language" defaultValue="en" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aspectRatio">Aspect ratio</Label>
                <select
                  id="aspectRatio"
                  name="aspectRatio"
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
                  defaultValue="9:16"
                >
                  <option value="9:16">9:16 (Shorts/Reels)</option>
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="1:1">1:1 (Square)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetDuration">Target duration (sec)</Label>
                <Input id="targetDuration" name="targetDuration" type="number" defaultValue={50} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Input id="tone" name="tone" placeholder="Energetic, expert, friendly" />
            </div>
            <Button disabled={loading} type="submit">
              {loading ? "Creating..." : "Continue to script"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
