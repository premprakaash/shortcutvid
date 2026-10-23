import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs/promises";
import path from "path";
import { getEnv, isS3Configured } from "@/lib/env";

function createS3Client() {
  const env = getEnv();
  return new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE ?? true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  if (isS3Configured()) {
    const env = getEnv();
    const client = createS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    if (env.S3_PUBLIC_URL) {
      return `${env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
    }
    return `s3://${env.S3_BUCKET}/${key}`;
  }

  const env = getEnv();
  const filePath = path.join(env.LOCAL_STORAGE_PATH, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, body);
  return `/api/media/${encodeURIComponent(key)}`;
}

export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  if (isS3Configured()) {
    const env = getEnv();
    const client = createS3Client();
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }
  return `/api/media/${encodeURIComponent(key)}`;
}

export async function readObject(key: string): Promise<Buffer> {
  if (isS3Configured()) {
    const env = getEnv();
    const client = createS3Client();
    const res = await client.send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Object not found: ${key}`);
    return Buffer.from(bytes);
  }
  const env = getEnv();
  return fs.readFile(path.join(env.LOCAL_STORAGE_PATH, key));
}
