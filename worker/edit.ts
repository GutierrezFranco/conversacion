import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FORMATS, getFormat } from "../lib/formats";
import { getStyle, isPremium, type EditStyle } from "../lib/styles";
import { getTemplate, type TemplateInstance } from "../lib/templates";
import { detectSilences, fontsDir, probe, render, type RenderOverlay } from "./media";
import { transcribe } from "./transcribe";
import { planEdit, type EditPlan, type PlanResource, type PlanTemplate } from "./plan";
import { renderWithHyperframes } from "./hyperframes";
import { placeTemplates, templateEvents } from "./templates";
import { assTime, buildCues, buildSegments, mapWordRange, outputDuration, toAss, type Word } from "./timeline";
import { download, uploadOutput, type Job, type JobResult } from "./storage";
import { creep, reportProgress, stretch, type ProgressStep } from "./progress";

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
  mode?: "fix" | "change";
  music?: { path: string; name: string; volume: "baja" | "media" | "alta" };
};

// Volumen de la música respecto de la voz (antes del ducking).
const MUSIC_VOLUME = { baja: 0.12, media: 0.2, alta: 0.32 } as const;

type EditResult = JobResult & { words: Word[]; plan: EditPlan; duration: number; summary: string };

export async function runEdit(job: Job, parent: Job | null): Promise<EditResult> {
  const params = job.params as EditParams;
  const style = params.style ?? getStyle(params.styleId);
  const format = getFormat(params.formatId ?? "camara") ?? FORMATS[0];
  if (!style) throw new Error("Estilo desconocido.");

  const dir = await mkdtemp(join(tmpdir(), "edicion-"));
  try {
    const rawFile = join(dir, "raw");
    const progress = (step: ProgressStep, pct: number) => reportProgress(job.id, step, pct).catch(() => {});
    await progress("descarga", 1);
    await download("uploads", params.rawPath, rawFile, (f) => void progress("descarga", stretch(1, 5, f)));
    const info = await probe(rawFile);
    if (!info.hasAudio) throw new Error("El video no tiene audio. Necesitamos tu voz para editarlo.");
    if (info.duration > MAX_RAW_SECONDS) throw new Error("El crudo dura más de 5 minutos. Cortalo un poco y volvé a subirlo.");

    // En una iteración reusamos la transcripción: es más rápido y por eso cobramos menos.
    const parentResult = parent?.result as EditResult | null | undefined;
    let words: Word[];
    if (parentResult?.words?.length) {
      words = parentResult.words;
    } else {
      await progress("escucha", 5);
      words = await transcribe(rawFile, (f) => void progress("escucha", stretch(5, 35, f)));
    }
    if (words.length < 3) throw new Error("No escuchamos a nadie hablando en el video.");

    const resources: PlanResource[] = params.resources.map((r, index) => ({ index, kind: r.kind, name: r.name, note: r.note }));
    const templateList = params.templates ?? [];
    const templates: PlanTemplate[] = templateList.map((t, index) => {
      const def = getTemplate(t.templateId);
      return { index, name: def?.name ?? t.templateId, text: Object.values(t.values).filter(Boolean).join(" · "), hint: def?.hint ?? "", note: t.note };
    });
    await progress("plan", 38);
    const stopCreep = creep(job.id, "plan", 38, 49, 60);
    const plan = await planEdit({
      words,
      style,
      format: { name: format.name, direction: format.direction, autoLabels: !!format.autoLabels },
      resources,
      templates,
      instructions: params.instructions,
      previous:
        parentResult?.plan && (params.changes || params.mode === "fix")
          ? { plan: parentResult.plan, changes: params.changes ?? "", mode: params.mode ?? "change" }
          : undefined,
    }).finally(stopCreep);

    const silences = await detectSilences(rawFile).catch(() => []);
    const segments = buildSegments(words, plan.keep, info.duration, silences);
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
    await progress("render", 50);
    if (premium) {
      const cutFile = join(dir, "cut.mp4");
      await render({ input: rawFile, output: cutFile, segments, overlays, music, keyframeEvery: 30 }, (f) => void progress("render", stretch(50, 70, f)));
      await progress("render", 72);
      const stopHfCreep = creep(job.id, "render", 72, 94, 120);
      try {
        await renderWithHyperframes({ dir, video: cutFile, output: outFile, duration, cues, style, templates: placed, fontsDir: fontsDir() });
      } catch (err) {
        // HyperFrames necesita ~2 GB de RAM. Si falla (por ejemplo en un servidor chico), entregamos igual
        // el reel con los subtítulos de ffmpeg en el mismo estilo, sin las animaciones.
        console.error(`[${job.id}] HyperFrames falló, sigo con ffmpeg`, err instanceof Error ? err.message.split("\n")[0] : err);
        const fallbackAss = join(dir, "subs.ass");
        await writeFile(fallbackAss, toAss(cues, style, templateLines));
        await render(
          { input: cutFile, output: outFile, segments: [{ start: 0, end: duration, zoom: false, outStart: 0 }], overlays: [], assFile: fallbackAss, fontsDir: fontsDir() },
          (f) => void progress("render", stretch(72, 95, f)),
        );
      } finally {
        stopHfCreep();
      }
    } else {
      await render({ input: rawFile, output: outFile, segments, overlays, assFile, fontsDir: fontsDir(), music }, (f) =>
        void progress("render", stretch(50, 95, f)),
      );
    }

    await progress("subida", 96);
    const stopUploadCreep = creep(job.id, "subida", 96, 99, 15);
    const path = await uploadOutput(job, outFile, "mp4", "video/mp4").finally(stopUploadCreep);
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
