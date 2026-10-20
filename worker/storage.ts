import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createAdminClient } from "../lib/supabase/admin";

export type JobResult = { outputs: { path: string; type: "video" | "image" }[] };

export type Job = {
  id: string;
  user_id: string;
  kind: "edit" | "image" | "video";
  params: Record<string, unknown>;
  parent_job_id: string | null;
  result: unknown;
  attempts: number;
};

export const db = createAdminClient();

export async function download(bucket: string, path: string, dest: string) {
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, 600);
  if (error || !data) throw new Error(`No se pudo leer ${path}`);
  await downloadUrl(data.signedUrl, dest);
}

export async function downloadUrl(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Descarga falló (${res.status})`);
  await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), createWriteStream(dest));
}

export async function uploadOutput(job: Job, file: string, ext: string, contentType: string, suffix = ""): Promise<string> {
  const path = `${job.user_id}/${job.id}${suffix}.${ext}`;
  const { error } = await db.storage.from("outputs").upload(path, await readFile(file), { contentType, upsert: true });
  if (error) throw new Error(`No se pudo guardar el resultado: ${error.message}`);
  return path;
}
