import path from "path";
import { getAppUrl, isS3Configured } from "@/lib/env";

export function resolveMediaUrlForWorker(storedUrl: string): string {
  if (storedUrl.startsWith("http://") || storedUrl.startsWith("https://")) {
    return storedUrl;
  }
  if (storedUrl.startsWith("file://")) {
    return storedUrl;
  }

  const apiPrefix = "/api/media/";
  if (storedUrl.startsWith(apiPrefix)) {
    const key = decodeURIComponent(storedUrl.slice(apiPrefix.length));
    if (!isS3Configured()) {
      const localRoot = path.resolve(process.env.LOCAL_STORAGE_PATH ?? "./storage");
      return `file://${path.join(localRoot, key)}`;
    }
    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? getAppUrl();
    return `${appUrl.replace(/\/$/, "")}${storedUrl}`;
  }

  return storedUrl;
}
