import { spawn } from "node:child_process";
import type { Segment } from "./timeline";

export function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err = (err + d).slice(-8000)));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} terminó con código ${code}:\n${err}`))));
  });
}

export async function probe(file: string): Promise<{ duration: number; width: number; height: number; hasAudio: boolean }> {
  const out = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", file]);
  const data = JSON.parse(out) as { format: { duration: string }; streams: { codec_type: string; width?: number; height?: number }[] };
  const video = data.streams.find((s) => s.codec_type === "video");
  if (!video) throw new Error("El archivo no tiene video.");
  return {
    duration: Number(data.format.duration),
    width: video.width ?? 1080,
    height: video.height ?? 1920,
    hasAudio: data.streams.some((s) => s.codec_type === "audio"),
  };
}

export async function extractAudio(input: string, output: string) {
  await run("ffmpeg", ["-y", "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", output]);
}

export type RenderOverlay = { file: string; kind: "image" | "video"; start: number; end: number; layout: "full" | "top" };

const W = 1080;
const H = 1920;

// Arma el comando de ffmpeg: corta y une segmentos, aplica zooms, superpone recursos
// y quema los subtítulos. Exportado aparte para poder revisarlo en tests.
export function buildRenderArgs(opts: {
  input: string;
  output: string;
  segments: Segment[];
  overlays: RenderOverlay[];
  assFile: string;
  fontsDir?: string;
}): string[] {
  const args = ["-y", "-i", opts.input];
  for (const o of opts.overlays) {
    if (o.kind === "image") args.push("-loop", "1", "-t", (o.end - o.start + 0.1).toFixed(3), "-i", o.file);
    else args.push("-i", o.file);
  }

  const f: string[] = [];
  const cover = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=30`;

  opts.segments.forEach((s, i) => {
    const zoom = s.zoom ? `,scale=${Math.round(W * 1.12)}:-2,crop=${W}:${H},setsar=1` : "";
    f.push(`[0:v]trim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},setpts=PTS-STARTPTS,${cover}${zoom}[v${i}]`);
    f.push(`[0:a]atrim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`);
  });
  const n = opts.segments.length;
  f.push(`${opts.segments.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${n}:v=1:a=1[base][aout]`);

  let last = "base";
  opts.overlays.forEach((o, k) => {
    const idx = k + 1;
    const dur = (o.end - o.start).toFixed(3);
    const fit =
      o.layout === "full"
        ? `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`
        : `scale=${Math.round(W * 0.86)}:${Math.round(H * 0.4)}:force_original_aspect_ratio=decrease`;
    f.push(`[${idx}:v]trim=duration=${dur},setpts=PTS-STARTPTS+${o.start.toFixed(3)}/TB,${fit},format=rgba[o${k}]`);
    const pos = o.layout === "full" ? "x=0:y=0" : `x=(W-w)/2:y=${Math.round(H * 0.12)}`;
    f.push(`[${last}][o${k}]overlay=${pos}:eof_action=pass:enable='between(t,${o.start.toFixed(3)},${o.end.toFixed(3)})'[ov${k}]`);
    last = `ov${k}`;
  });

  const assPath = opts.assFile.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
  const fonts = opts.fontsDir ? `:fontsdir='${opts.fontsDir}'` : "";
  f.push(`[${last}]ass='${assPath}'${fonts},format=yuv420p[vout]`);

  args.push(
    "-filter_complex", f.join(";"),
    "-map", "[vout]", "-map", "[aout]",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
    "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart",
    opts.output,
  );
  return args;
}

export async function render(opts: Parameters<typeof buildRenderArgs>[0]) {
  await run("ffmpeg", buildRenderArgs(opts));
}

export function fontsDir(): string | undefined {
  return process.env.FONTS_DIR;
}

// Fotogramas repartidos a lo largo del video, achicados para mandarlos a la IA.
export async function extractFrames(input: string, duration: number, count: number, outPrefix: string): Promise<string[]> {
  const files: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = (duration * (i + 0.5)) / count;
    const file = `${outPrefix}-${i}.jpg`;
    await run("ffmpeg", ["-y", "-ss", t.toFixed(2), "-i", input, "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "4", file]);
    files.push(file);
  }
  return files;
}

// Convierte una imagen cualquiera a JPG de hasta 1080 px para la IA.
export async function toJpeg(input: string, output: string) {
  await run("ffmpeg", ["-y", "-i", input, "-frames:v", "1", "-vf", "scale='min(1080,iw)':-2", "-q:v", "3", output]);
}

// Cantidad de cortes de cámara (cambios de escena) en el video.
export function countCuts(input: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", ["-i", input, "-vf", "scale=320:-2,select='gt(scene,0.3)',showinfo", "-an", "-f", "null", "-"], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let cuts = 0;
    let rest = "";
    p.stderr.on("data", (d) => {
      const text = rest + d;
      const lines = text.split("\n");
      rest = lines.pop() ?? "";
      cuts += lines.filter((l) => l.includes("Parsed_showinfo") && l.includes("pts_time")).length;
    });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(cuts) : reject(new Error(`ffmpeg terminó con código ${code}`))));
  });
}
