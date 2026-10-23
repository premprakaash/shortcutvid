import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  "AI scriptwriting with structured scene manifests",
  "Stock footage selection via Pexels",
  "OpenAI voiceovers and subtitle alignment",
  "Remotion rendering to MP4 with preview and download",
  "Background jobs with Redis + BullMQ progress tracking",
];

const faqs = [
  {
    q: "Do I need API keys?",
    a: "Phase 1 requires OpenAI and Pexels keys. Object storage can use local disk or S3-compatible MinIO.",
  },
  {
    q: "Can I publish to social platforms yet?",
    a: "OAuth publishing is planned for Phase 3. Phase 1 focuses on end-to-end MP4 generation.",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-16 flex items-center justify-between">
        <div className="text-xl font-bold tracking-tight">ShortcutVid</div>
        <div className="flex gap-3">
          <Button asChild variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Start free</Link>
          </Button>
        </div>
      </header>

      <section className="mb-20 grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-indigo-300">
            AI video automation SaaS
          </p>
          <h1 className="mb-5 text-4xl font-bold leading-tight text-white md:text-5xl">
            Idea to short-form video in one guided workflow
          </h1>
          <p className="mb-8 max-w-xl text-lg text-slate-300">
            Generate scripts, voiceovers, subtitles, and rendered MP4s ready for
            YouTube Shorts, Reels, and LinkedIn — with real backend jobs, not a
            mock UI.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/register">Create your first video</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">View dashboard</Link>
            </Button>
          </div>
        </div>
        <Card className="border-indigo-500/30 bg-slate-900/60">
          <CardHeader>
            <CardTitle>Phase 1 MVP pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>Idea → Script → Scene plan → Voiceover → Assets → Subtitles → MP4</p>
            <p className="text-slate-400">
              Stripe billing, OAuth publishing, and scheduling arrive in later phases.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mb-20">
        <h2 className="mb-6 text-2xl font-semibold">What&apos;s included now</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <Card key={feature}>
              <CardContent className="p-5 text-slate-300">{feature}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-20 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Starter — $19/mo</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300">
            Monthly video credits, standard queue, core creation features (Phase 2 billing).
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pro — $49/mo</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300">
            Higher credits, priority rendering, advanced customization (Phase 2+).
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">FAQ</h2>
        <div className="space-y-4">
          {faqs.map((item) => (
            <Card key={item.q}>
              <CardContent className="p-5">
                <p className="font-medium text-white">{item.q}</p>
                <p className="mt-2 text-sm text-slate-400">{item.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
