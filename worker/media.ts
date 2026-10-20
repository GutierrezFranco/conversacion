import { spawn } from "node:child_process";
import type { Segment, Silence } from "./timeline";

// onOutput recibe cada pedazo de salida (stdout y stderr) a medida que llega, para leer el avance.
export function run(cmd: string, args: string[], onOutput?: (chunk: string) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => {
      out += d;
      onOutput?.(String(d));
    });
    p.stderr.on("data", (d) => {
      err = (err + d).slice(-8000);
      onOutput?.(String(d));
    });
    p.on("error", reject);
    // Si el sistema mata el proceso (por ejemplo, por falta de memoria) no hay código sino una señal.
    p.on("close", (code, signal) =>
      code === 0 ? resolve(out) : reject(new Error(`${cmd} terminó con ${signal ? `la señal ${signal}` : `código ${code}`}:\n${err}`)),
    );
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
  assFile?: string; // sin subtítulos cuando los dibuja HyperFrames
  fontsDir?: string;
  // Música de fondo: se repite si es corta, baja sola cuando hablás y se apaga al final.
  music?: { file: string; volume: number; duration: number };
  // Un fotograma clave cada tantos cuadros. HyperFrames lo necesita seguido para leer el video sin congelarse.
  keyframeEvery?: number;
}): string[] {
  // Pocos hilos: ffmpeg usa uno por cada núcleo que ve, y en servidores compartidos ve decenas;
  // cada hilo guarda sus propios fotogramas y se queda sin memoria. FFMPEG_THREADS lo cambia.
  const threads = String(process.env.FFMPEG_THREADS ?? 2);
  const args = ["-y", "-threads", threads, "-i", opts.input];
  for (const o of opts.overlays) {
    if (o.kind === "image") args.push("-loop", "1", "-t", (o.end - o.start + 0.1).toFixed(3), "-i", o.file);
    else args.push("-i", o.file);
  }
  if (opts.music) args.push("-stream_loop", "-1", "-i", opts.music.file);

  const f: string[] = [];
  const cover = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=30`;

  const n = opts.segments.length;
  // Se achica una sola vez antes de repartir en segmentos: si el crudo es 4K, cada fotograma
  // en espera ocupa 4 veces menos memoria.
  f.push(`[0:v]${cover},split=${n}${opts.segments.map((_, i) => `[c${i}]`).join("")}`);
  f.push(`[0:a]asplit=${n}${opts.segments.map((_, i) => `[ca${i}]`).join("")}`);
  opts.segments.forEach((s, i) => {
    const zoom = s.zoom ? `,scale=${Math.round(W * 1.12)}:-2,crop=${W}:${H},setsar=1` : "";
    f.push(`[c${i}]trim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},setpts=PTS-STARTPTS${zoom}[v${i}]`);
    f.push(`[ca${i}]atrim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`);
  });
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

  if (opts.assFile) {
    const assPath = opts.assFile.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
    const fonts = opts.fontsDir ? `:fontsdir='${opts.fontsDir}'` : "";
    f.push(`[${last}]ass='${assPath}'${fonts},format=yuv420p[vout]`);
  } else {
    f.push(`[${last}]format=yuv420p[vout]`);
  }

  let audioOut = "aout";
  if (opts.music) {
    const m = opts.music;
    const idx = opts.overlays.length + 1;
    const fadeStart = Math.max(0, m.duration - 1.5).toFixed(3);
    f.push(`[aout]asplit=2[voice][sidechain]`);
    f.push(
      `[${idx}:a]atrim=duration=${m.duration.toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,` +
        `volume=${m.volume.toFixed(3)},afade=t=out:st=${fadeStart}:d=1.5[music]`,
    );
    // Ducking: la música baja mientras hay voz.
    f.push(`[music][sidechain]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[ducked]`);
    f.push(`[voice][ducked]amix=inputs=2:duration=first:normalize=0[mix]`);
    audioOut = "mix";
  }

  args.push(
    "-filter_complex_threads", threads,
    "-filter_complex", f.join(";"),
    "-map", "[vout]", "-map", `[${audioOut}]`,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-threads", threads,
    ...(opts.keyframeEvery ? ["-g", String(opts.keyframeEvery), "-keyint_min", String(opts.keyframeEvery)] : []),
    "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart",
    opts.output,
  );
  return args;
}

// onProgress recibe de 0 a 1 según cuánto del video final ya se armó.
export async function render(opts: Parameters<typeof buildRenderArgs>[0], onProgress?: (fraction: number) => void) {
  const total = opts.segments.reduce((sum, s) => sum + (s.end - s.start), 0);
  const args = buildRenderArgs(opts);
  // -progress escribe "out_time_us=..." en stdout cada medio segundo.
  args.splice(args.length - 1, 0, "-progress", "pipe:1", "-nostats");
  await run("ffmpeg", args, (chunk) => {
    const m = [...chunk.matchAll(/out_time_us=(\d+)/g)].pop();
    if (m && total > 0) onProgress?.(Number(m[1]) / 1e6 / total);
  });
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

// Silencios del audio (por debajo de -35 dB durante al menos 0,35 s), en segundos del original.
export async function detectSilences(input: string): Promise<Silence[]> {
  const out: Silence[] = [];
  const state = { pending: null as number | null, rest: "" };
  const read = (line: string) => {
    const m = line.match(/silence_(start|end): (-?[\d.]+)/);
    if (!m) return;
    const t = Math.max(0, Number(m[2]));
    if (m[1] === "start") state.pending = t;
    else if (state.pending !== null) {
      out.push({ start: state.pending, end: t });
      state.pending = null;
    }
  };
  await run("ffmpeg", ["-hide_banner", "-nostats", "-i", input, "-vn", "-af", "silencedetect=noise=-35dB:d=0.35", "-f", "null", "-"], (chunk) => {
    const lines = (state.rest + chunk).split("\n");
    state.rest = lines.pop() ?? "";
    lines.forEach(read);
  });
  read(state.rest);
  // Un silencio que dura hasta el final del archivo no trae silence_end.
  if (state.pending !== null) out.push({ start: state.pending, end: Number.MAX_SAFE_INTEGER });
  return out;
}
