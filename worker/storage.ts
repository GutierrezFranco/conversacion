import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { signedReadUrls, uploadFile, type Bucket } from "../lib/files";
import { createAdminClient } from "../lib/supabase/admin";

export type JobResult = { outputs: { path: string; type: "video" | "image" }[] };

export type Job = {
  id: string;
  user_id: string;
  kind: "edit" | "image" | "video" | "reference";
  params: Record<string, unknown>;
  parent_job_id: string | null;
  result: unknown;
  attempts: number;
};

export const db = createAdminClient();

// onProgress recibe de 0 a 1 según cuánto se bajó (si el servidor informa el tamaño).
export async function download(bucket: Bucket, path: string, dest: string, onProgress?: (fraction: number) => void) {
  const url = (await signedReadUrls(bucket, [path], 600))[path];
  if (!url) throw new Error(`No se pudo leer ${path}`);
  await downloadUrl(url, dest, onProgress);
}

export async function downloadUrl(url: string, dest: string, onProgress?: (fraction: number) => void) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Descarga falló (${res.status})`);
  const total = Number(res.headers.get("content-length") ?? 0);
  let received = 0;
  const body = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream);
  if (onProgress && total > 0) {
    body.on("data", (chunk: Buffer) => {
      received += chunk.length;
      onProgress(received / total);
    });
  }
  await pipeline(body, createWriteStream(dest));
}

export async function uploadOutput(job: Job, file: string, ext: string, contentType: string, suffix = ""): Promise<string> {
  const path = `${job.user_id}/${job.id}${suffix}.${ext}`;
  await uploadFile("outputs", path, file, contentType);
  return path;
}
