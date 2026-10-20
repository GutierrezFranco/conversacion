"use client";

// Helpers del navegador para hablar con nuestra API.

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Algo salió mal.");
  return data as T;
}

// Sube un archivo directo a Supabase Storage con una URL firmada, informando el progreso.
export async function uploadFile(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const { path, token } = await api<{ path: string; token: string }>("/api/uploads", { filename: file.name });
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/uploads/${path}?token=${encodeURIComponent(token)}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("No se pudo subir el archivo.")));
    xhr.onerror = () => reject(new Error("Se cortó la conexión mientras subía el archivo."));
    xhr.send(file);
  });

  return path;
}

export type JobSummary = {
  id: string;
  kind: "edit" | "image" | "video";
  status: "queued" | "processing" | "done" | "failed";
  title: string | null;
  cost: number;
  parent_job_id: string | null;
  error: string | null;
  created_at: string;
  outputs: { path: string; type: "video" | "image"; url: string | null }[];
};

export const STATUS_LABEL: Record<JobSummary["status"], string> = {
  queued: "En cola",
  processing: "Editando…",
  done: "Listo",
  failed: "Falló · créditos devueltos",
};

export const STATUS_CLASS: Record<JobSummary["status"], string> = {
  queued: "pill",
  processing: "pill pill-accent",
  done: "pill pill-ok",
  failed: "pill pill-danger",
};
