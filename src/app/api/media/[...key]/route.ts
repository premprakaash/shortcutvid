import { NextResponse } from "next/server";
import { readObject } from "@/lib/storage/object-storage";

type Params = { params: Promise<{ key: string[] }> };

export async function GET(_request: Request, { params }: Params) {
  const { key: parts } = await params;
  const key = decodeURIComponent(parts.join("/"));

  if (key.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const data = await readObject(key);
    const contentType = key.endsWith(".mp4")
      ? "video/mp4"
      : key.endsWith(".mp3")
        ? "audio/mpeg"
        : "application/octet-stream";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
