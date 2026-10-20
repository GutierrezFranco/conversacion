import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fal } from "@fal-ai/client";
import { downloadUrl, uploadOutput, type Job, type JobResult } from "./storage";

type ImageParams = { endpoint: string; prompt: string; aspectRatio: string; count: number };
type VideoParams = { endpoint: string; prompt: string; aspectRatio: string; seconds: number };

// Cada modelo de fal pide la relación de aspecto con un nombre distinto.
const SEEDREAM_SIZES: Record<string, string> = {
  "9:16": "portrait_16_9",
  "4:5": "portrait_4_3",
  "1:1": "square_hd",
  "16:9": "landscape_16_9",
};

function imageInput(p: ImageParams): Record<string, unknown> {
  if (p.endpoint.includes("seedream")) {
    return { prompt: p.prompt, num_images: p.count, image_size: SEEDREAM_SIZES[p.aspectRatio] ?? "auto_2K" };
  }
  return { prompt: p.prompt, num_images: p.count, aspect_ratio: p.aspectRatio, output_format: "jpeg" };
}

function videoInput(p: VideoParams): Record<string, unknown> {
  if (p.endpoint.startsWith("minimax/")) {
    return { prompt: p.prompt, duration: p.seconds, aspect_ratio: p.aspectRatio, prompt_expansion_mode: "balanced" };
  }
  if (p.endpoint.includes("seedance")) {
    return { prompt: p.prompt, duration: String(p.seconds), aspect_ratio: p.aspectRatio, resolution: "720p" };
  }
  return { prompt: p.prompt, duration: String(p.seconds), aspect_ratio: p.aspectRatio };
}

// Las URLs de fal vencen, así que copiamos cada resultado a nuestro Storage.
async function saveOutputs(job: Job, urls: string[], type: "image" | "video"): Promise<JobResult> {
  const dir = await mkdtemp(join(tmpdir(), "gen-"));
  try {
    const outputs: JobResult["outputs"] = [];
    for (const [i, url] of urls.entries()) {
      const ext = type === "video" ? "mp4" : url.split("?")[0].split(".").pop()?.toLowerCase() || "jpg";
      const file = join(dir, `${i}.${ext}`);
      await downloadUrl(url, file);
      const contentType = type === "video" ? "video/mp4" : `image/${ext === "jpg" ? "jpeg" : ext}`;
      outputs.push({ path: await uploadOutput(job, file, ext, contentType, `-${i}`), type });
    }
    return { outputs };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function runImage(job: Job): Promise<JobResult> {
  const params = job.params as ImageParams;
  const { data } = await fal.subscribe(params.endpoint, { input: imageInput(params) });
  const images = (data as { images?: { url: string }[] }).images ?? [];
  if (images.length === 0) throw new Error("El modelo no devolvió imágenes. Probá con otra descripción.");
  return saveOutputs(job, images.map((i) => i.url), "image");
}

export async function runVideo(job: Job): Promise<JobResult> {
  const params = job.params as VideoParams;
  const { data } = await fal.subscribe(params.endpoint, { input: videoInput(params) });
  const video = (data as { video?: { url: string } }).video;
  if (!video?.url) throw new Error("El modelo no devolvió el video. Probá con otra descripción.");
  return saveOutputs(job, [video.url], "video");
}
