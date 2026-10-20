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

export async function download(bucket: Bucket, path: string, dest: string) {
  const url = (await signedReadUrls(bucket, [path], 600))[path];
  if (!url) throw new Error(`No se pudo leer ${path}`);
  await downloadUrl(url, dest);
}

export async function downloadUrl(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Descarga falló (${res.status})`);
  await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), createWriteStream(dest));
}

export async function uploadOutput(job: Job, file: string, ext: string, contentType: string, suffix = ""): Promise<string> {
  const path = `${job.user_id}/${job.id}${suffix}.${ext}`;
  await uploadFile("outputs", path, file, contentType);
  return path;
}
