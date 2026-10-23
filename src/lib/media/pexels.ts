import { isPexelsConfigured } from "@/lib/env";

export type PexelsVideo = {
  id: number;
  url: string;
  width: number;
  height: number;
  duration: number;
  previewUrl: string;
  photographer: string;
  sourceUrl: string;
};

type PexelsSearchResponse = {
  videos: Array<{
    id: number;
    url: string;
    width: number;
    height: number;
    duration: number;
    image: string;
    user: { name: string };
    video_files: Array<{
      id: number;
      quality: string;
      width: number;
      height: number;
      link: string;
    }>;
  }>;
};

function scoreVideo(
  video: PexelsSearchResponse["videos"][number],
  keywords: string[],
  preferVertical: boolean,
): number {
  const haystack = `${video.url} ${keywords.join(" ")}`.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (haystack.includes(kw.toLowerCase())) score += 2;
  }
  const ratio = video.height / Math.max(video.width, 1);
  if (preferVertical && ratio > 1.1) score += 3;
  if (!preferVertical && ratio < 0.9) score += 3;
  score += Math.min(video.duration, 30) / 30;
  return score;
}

export async function searchPexelsVideos(
  keywords: string[],
  options?: { preferVertical?: boolean; perPage?: number },
): Promise<PexelsVideo[]> {
  if (!isPexelsConfigured()) {
    throw new Error(
      "PEXELS_API_KEY is not configured. Add it to search stock footage.",
    );
  }
  const query = keywords.slice(0, 4).join(" ");
  const url = new URL("https://api.pexels.com/videos/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(options?.perPage ?? 8));

  const res = await fetch(url.toString(), {
    headers: { Authorization: process.env.PEXELS_API_KEY! },
  });
  if (!res.ok) {
    throw new Error(`Pexels search failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as PexelsSearchResponse;
  const preferVertical = options?.preferVertical ?? true;

  const ranked = data.videos
    .map((video) => {
      const file =
        video.video_files
          .filter((f) => f.link.startsWith("https://"))
          .sort((a, b) => b.height - a.height)[0] ??
        video.video_files[0];
      if (!file) return null;
      return {
        video: {
          id: video.id,
          url: file.link,
          width: file.width,
          height: file.height,
          duration: video.duration,
          previewUrl: video.image,
          photographer: video.user.name,
          sourceUrl: video.url,
        },
        score: scoreVideo(video, keywords, preferVertical),
      };
    })
    .filter((item): item is { video: PexelsVideo; score: number } => item !== null)
    .sort((a, b) => b.score - a.score);

  return ranked.map((item) => item.video);
}

const ALLOWED_DOWNLOAD_HOSTS = ["videos.pexels.com", "images.pexels.com"];

export async function downloadAllowedMedia(url: string): Promise<Buffer> {
  const parsed = new URL(url);
  if (!ALLOWED_DOWNLOAD_HOSTS.some((h) => parsed.hostname.endsWith(h))) {
    throw new Error(`Blocked download from untrusted host: ${parsed.hostname}`);
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
