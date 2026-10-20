"use client";

// Helpers del navegador para hablar con nuestra API.

export async function api<T>(path: string, body?: unknown, method?: "DELETE"): Promise<T> {
  const res = await fetch(path, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Algo salió mal.");
  return data as T;
}

// Sube un archivo directo al almacenamiento (Supabase o R2) con una URL firmada, informando el progreso.
export async function uploadFile(file: File, purpose: "raw" | "asset" | "ref", onProgress?: (pct: number) => void): Promise<string> {
  const { path, url, headers } = await api<{ path: string; url: string; headers: Record<string, string> }>("/api/uploads", {
    filename: file.name,
    size: file.size,
    purpose,
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
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

export type Asset = { id: string; path: string; name: string; kind: "image" | "video" | "audio"; size_bytes: number; created_at: string; url: string | null };

// Sube un recurso y lo guarda en la carpeta del usuario para reusarlo después.
export async function uploadAsset(file: File, onProgress?: (pct: number) => void): Promise<Asset> {
  const path = await uploadFile(file, "asset", onProgress);
  const { asset } = await api<{ asset: Asset }>("/api/assets", { path, name: file.name });
  return { ...asset, url: URL.createObjectURL(file) };
}
