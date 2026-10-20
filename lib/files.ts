// Dónde se guardan los videos, recursos y reels. Dos opciones con la misma interfaz:
//   STORAGE_PROVIDER=supabase  → Supabase Storage (simple, pero el plan gratis no acepta archivos de más de 50 MB)
//   STORAGE_PROVIDER=r2        → Cloudflare R2 (10 GB gratis, sin cargo por descargas, archivos grandes)
// La web y el worker solo usan estas funciones; nunca hablan directo con el proveedor.

import { readFile } from "node:fs/promises";
import { DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";
import { createAdminClient } from "./supabase/admin";

export type Bucket = "uploads" | "outputs";
export type SignedUpload = { url: string; headers: Record<string, string> };

function provider(): "supabase" | "r2" {
  return process.env.STORAGE_PROVIDER === "r2" ? "r2" : "supabase";
}

// ---------- Cloudflare R2 (API compatible con S3) ----------
// Un solo bucket de R2; "uploads/" y "outputs/" son prefijos dentro de él.

let s3: S3Client | null = null;
function r2(): S3Client {
  s3 ??= new S3Client({
    region: "auto",
    // R2_ENDPOINT solo hace falta para apuntar a otro servicio compatible con S3 (por ejemplo en tests).
    endpoint: process.env.R2_ENDPOINT ?? `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    // Sin esto el SDK firma la subida con el checksum de un archivo vacío y R2 la rechaza.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") },
  });
  return s3;
}
const r2Bucket = () => env("R2_BUCKET");
const key = (bucket: Bucket, path: string) => `${bucket}/${path}`;

// ---------- Interfaz común ----------

// URL para que el navegador suba el archivo directo, sin pasar por nuestro servidor.
export async function signedUploadUrl(bucket: Bucket, path: string): Promise<SignedUpload> {
  if (provider() === "r2") {
    const url = await getSignedUrl(r2(), new PutObjectCommand({ Bucket: r2Bucket(), Key: key(bucket, path) }), { expiresIn: 2 * 60 * 60 });
    return { url, headers: {} };
  }
  const { data, error } = await createAdminClient().storage.from(bucket).createSignedUploadUrl(path);
  if (error) throw error;
  return {
    url: `${env("NEXT_PUBLIC_SUPABASE_URL")}/storage/v1/object/upload/sign/${bucket}/${path}?token=${encodeURIComponent(data.token)}`,
    headers: { apikey: env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), "x-upsert": "false" },
  };
}

// URLs de lectura temporales (para ver o descargar).
export async function signedReadUrls(bucket: Bucket, paths: string[], seconds = 3600): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (paths.length === 0) return out;
  if (provider() === "r2") {
    await Promise.all(
      paths.map(async (p) => {
        out[p] = await getSignedUrl(r2(), new GetObjectCommand({ Bucket: r2Bucket(), Key: key(bucket, p) }), { expiresIn: seconds });
      }),
    );
    return out;
  }
  const { data } = await createAdminClient().storage.from(bucket).createSignedUrls(paths, seconds);
  for (const item of data ?? []) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}

// Tamaño real del archivo subido, o null si no existe.
export async function fileSize(bucket: Bucket, path: string): Promise<number | null> {
  if (provider() === "r2") {
    try {
      const head = await r2().send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: key(bucket, path) }));
      return head.ContentLength ?? 0;
    } catch {
      return null;
    }
  }
  const { data, error } = await createAdminClient().storage.from(bucket).info(path);
  return error || !data ? null : (data.size ?? 0);
}

export async function uploadFile(bucket: Bucket, path: string, file: string, contentType: string) {
  const body = await readFile(file);
  if (provider() === "r2") {
    await r2().send(new PutObjectCommand({ Bucket: r2Bucket(), Key: key(bucket, path), Body: body, ContentType: contentType }));
    return;
  }
  const { error } = await createAdminClient().storage.from(bucket).upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(`No se pudo guardar el archivo: ${error.message}`);
}

export async function removeFiles(bucket: Bucket, paths: string[]) {
  if (paths.length === 0) return;
  if (provider() === "r2") {
    // DeleteObjects acepta hasta 1000 claves por pedido.
    for (let i = 0; i < paths.length; i += 1000) {
      await r2().send(
        new DeleteObjectsCommand({ Bucket: r2Bucket(), Delete: { Objects: paths.slice(i, i + 1000).map((p) => ({ Key: key(bucket, p) })) } }),
      );
    }
    return;
  }
  await createAdminClient().storage.from(bucket).remove(paths);
}

// Archivos más viejos que `days` dentro de <user_id>/<folder>/ ("" = directo en la carpeta del usuario).
export async function expiredFiles(bucket: Bucket, folder: string, days: number): Promise<string[]> {
  if (provider() === "r2") {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const out: string[] = [];
    let token: string | undefined;
    do {
      const page = await r2().send(new ListObjectsV2Command({ Bucket: r2Bucket(), Prefix: `${bucket}/`, ContinuationToken: token }));
      for (const obj of page.Contents ?? []) {
        const path = obj.Key!.slice(bucket.length + 1);
        if (inFolder(path, folder) && obj.LastModified && obj.LastModified.getTime() < cutoff) out.push(path);
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token && out.length < 500);
    return out.slice(0, 500);
  }
  const { data, error } = await createAdminClient().rpc("expired_objects", { p_bucket: bucket, p_folder: folder, p_days: days });
  if (error) throw error;
  return (data ?? []) as string[];
}

// "u1/raw/a.mp4" está en "raw"; "u1/j.mp4" está en "" (la raíz del usuario).
export function inFolder(path: string, folder: string): boolean {
  const parts = path.split("/");
  return folder ? parts.length === 3 && parts[1] === folder : parts.length === 2;
}
