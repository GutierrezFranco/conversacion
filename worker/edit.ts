import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { env } from "../lib/env";
import { FORMATS, getFormat } from "../lib/formats";
import { getStyle, isPremium, type EditStyle } from "../lib/styles";
import { getTemplate, type TemplateInstance } from "../lib/templates";
import { extractAudio, fontsDir, probe, render, type RenderOverlay } from "./media";
import { planEdit, type EditPlan, type PlanResource, type PlanTemplate } from "./plan";
import { renderWithHyperframes } from "./hyperframes";
import { placeTemplates, templateEvents } from "./templates";
import { assTime, buildCues, buildSegments, mapWordRange, outputDuration, toAss, type Word } from "./timeline";
import { download, uploadOutput, type Job, type JobResult } from "./storage";

const MAX_RAW_SECONDS = 5 * 60;

type EditParams = {
  rawPath: string;
  styleId: string;
  formatId?: string;
  style?: EditStyle; // copia del estilo propio (sacado de una referencia)
  resources: { path: string; name: string; kind: "image" | "video"; note: string }[];
  templates?: TemplateInstance[];
  instructions: string;
  changes?: string;
  music?: { path: string; name: string; volume: "baja" | "media" | "alta" };
};

// Volumen de la música respecto de la voz (antes del ducking).
const MUSIC_VOLUME = { baja: 0.12, media: 0.2, alta: 0.32 } as const;

type EditResult = JobResult & { words: Word[]; plan: EditPlan; duration: number; summary: string };

// Transcripción palabra por palabra con ElevenLabs Scribe.
// No limpiamos muletillas acá: Claude necesita verlas con sus tiempos para cortarlas.
async function transcribe(audioFile: string): Promise<Word[]> {
  const client = new ElevenLabsClient({ apiKey: env("ELEVENLABS_API_KEY") });
  const res = await client.speechToText.convert({
    file: new Blob([await readFile(audioFile)], { type: "audio/mpeg" }),
    modelId: "scribe_v2",
    languageCode: "spa",
    timestampsGranularity: "word",
    diarize: false,
    tagAudioEvents: false,
  });
  return res.words
    .filter((w) => w.type === "word" && w.start !== undefined && w.end !== undefined)
    .map((w, i) => ({ i, text: w.text.trim(), start: w.start!, end: w.end! }));
}

export async function runEdit(job: Job, parent: Job | null): Promise<EditResult> {
  const params = job.params as EditParams;
  const style = params.style ?? getStyle(params.styleId);
  const format = getFormat(params.formatId ?? "camara") ?? FORMATS[0];
  if (!style) throw new Error("Estilo desconocido.");

  const dir = await mkdtemp(join(tmpdir(), "edicion-"));
  try {
    const rawFile = join(dir, "raw");
    await download("uploads", params.rawPath, rawFile);
    const info = await probe(rawFile);
    if (!info.hasAudio) throw new Error("El video no tiene audio. Necesitamos tu voz para editarlo.");
    if (info.duration > MAX_RAW_SECONDS) throw new Error("El crudo dura más de 5 minutos. Cortalo un poco y volvé a subirlo.");

    // En una iteración reusamos la transcripción: es más rápido y por eso cobramos menos.
    const parentResult = parent?.result as EditResult | null | undefined;
    let words: Word[];
    if (parentResult?.words?.length) {
      words = parentResult.words;
    } else {
      const audio = join(dir, "audio.mp3");
      await extractAudio(rawFile, audio);
      words = await transcribe(audio);
    }
    if (words.length < 3) throw new Error("No escuchamos a nadie hablando en el video.");

    const resources: PlanResource[] = params.resources.map((r, index) => ({ index, kind: r.kind, name: r.name, note: r.note }));
    const templateList = params.templates ?? [];
    const templates: PlanTemplate[] = templateList.map((t, index) => {
      const def = getTemplate(t.templateId);
      return { index, name: def?.name ?? t.templateId, text: Object.values(t.values).filter(Boolean).join(" · "), hint: def?.hint ?? "", note: t.note };
    });
    const plan = await planEdit({
      words,
      style,
      format: { name: format.name, direction: format.direction, autoLabels: !!format.autoLabels },
      resources,
      templates,
      instructions: params.instructions,
      previous: parentResult?.plan && params.changes ? { plan: parentResult.plan, changes: params.changes } : undefined,
    });

    const segments = buildSegments(words, plan.keep, info.duration);
    if (segments.length === 0) throw new Error("El plan de edición dejó el video vacío.");

    const overlays: RenderOverlay[] = [];
    for (const o of plan.overlays) {
      const res = params.resources[o.resource];
      const range = res && mapWordRange(words, segments, o.fromWord, o.toWord);
      if (!res || !range) continue;
      const file = join(dir, `res-${o.resource}`);
      if (!overlays.some((x) => x.file === file)) {
        try {
          await download("uploads", res.path, file);
        } catch {
          continue; // el usuario borró el recurso de su carpeta: seguimos sin él
        }
      }
      // Mínimo 1,2 s en pantalla para que se llegue a ver.
      const end = Math.min(Math.max(range.end, range.start + 1.2), outputDuration(segments));
      overlays.push({ file, kind: res.kind, start: range.start, end, layout: o.layout });
    }

    const duration = outputDuration(segments);
    // Las etiquetas que escribió Claude (formato paso a paso) se dibujan como la plantilla «Etiqueta».
    const labels: TemplateInstance[] = format.autoLabels
      ? plan.labels.slice(0, 12).map((l) => ({ templateId: "etiqueta", values: { texto: l.text.slice(0, 24) }, note: "" }))
      : [];
    const placements = [
      ...plan.templates,
      ...(format.autoLabels ? plan.labels.slice(0, 12) : []).map((l, i) => ({ template: templateList.length + i, fromWord: l.fromWord, toWord: l.toWord })),
    ];
    const placed = placeTemplates([...templateList, ...labels], placements, (a, b) => mapWordRange(words, segments, a, b), duration).filter(
      // Una etiqueta cuyas palabras se cortaron no tiene sentido mostrarla al principio.
      (p, i) => i < templateList.length || mapWordRange(words, segments, placements[i].fromWord, placements[i].toWord),
    );
    const templateLines = placed.flatMap((p) => templateEvents(p.instance, { start: assTime(p.start), end: assTime(p.end) }));

    const cues = buildCues(words, segments, new Set(plan.highlights), style.captions.wordsPerLine);
    const premium = isPremium(style);
    // Motor por defecto: ffmpeg dibuja todo en una pasada (subtítulos ASS).
    // Premium: ffmpeg corta sin subtítulos y HyperFrames dibuja subtítulos y plantillas animados.
    const assFile = premium ? undefined : join(dir, "subs.ass");
    if (assFile) await writeFile(assFile, toAss(cues, style, templateLines));

    let music: { file: string; volume: number; duration: number } | undefined;
    if (params.music) {
      const file = join(dir, "music");
      try {
        await download("uploads", params.music.path, file);
        music = { file, volume: MUSIC_VOLUME[params.music.volume] ?? MUSIC_VOLUME.baja, duration };
      } catch {
        // el usuario borró la música de su carpeta: seguimos sin música
      }
    }

    const outFile = join(dir, "out.mp4");
    if (premium) {
      const cutFile = join(dir, "cut.mp4");
      await render({ input: rawFile, output: cutFile, segments, overlays, music });
      await renderWithHyperframes({ dir, video: cutFile, output: outFile, duration, cues, style, templates: placed, fontsDir: fontsDir() });
    } else {
      await render({ input: rawFile, output: outFile, segments, overlays, assFile, fontsDir: fontsDir(), music });
    }

    const path = await uploadOutput(job, outFile, "mp4", "video/mp4");
    return {
      outputs: [{ path, type: "video" }],
      words,
      plan,
      duration,
      summary: plan.summary,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
