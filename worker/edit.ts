import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fal } from "@fal-ai/client";
import { getStyle } from "../lib/styles";
import { extractAudio, fontsDir, probe, render, type RenderOverlay } from "./media";
import { planEdit, type EditPlan, type PlanResource } from "./plan";
import { buildCues, buildSegments, mapWordRange, outputDuration, toAss, type Word } from "./timeline";
import { download, uploadOutput, type Job, type JobResult } from "./storage";

const MAX_RAW_SECONDS = 5 * 60;

type EditParams = {
  rawPath: string;
  styleId: string;
  resources: { path: string; name: string; kind: "image" | "video"; note: string }[];
  instructions: string;
  changes?: string;
};

type EditResult = JobResult & { words: Word[]; plan: EditPlan; duration: number; summary: string };

async function transcribe(audioFile: string): Promise<Word[]> {
  const url = await fal.storage.upload(new Blob([await readFile(audioFile)], { type: "audio/mpeg" }));
  const { data } = await fal.subscribe("fal-ai/elevenlabs/speech-to-text/scribe-v2", {
    input: { audio_url: url, language_code: "spa", diarize: false, tag_audio_events: false },
  });
  const out = data as { words: { text: string; type: string; start: number | null; end: number | null }[] };
  return out.words
    .filter((w) => w.type === "word" && w.start !== null && w.end !== null)
    .map((w, i) => ({ i, text: w.text.trim(), start: w.start!, end: w.end! }));
}

export async function runEdit(job: Job, parent: Job | null): Promise<EditResult> {
  const params = job.params as EditParams;
  const style = getStyle(params.styleId);
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
    const plan = await planEdit({
      words,
      style,
      resources,
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
      if (!overlays.some((x) => x.file === file)) await download("uploads", res.path, file);
      // Mínimo 1,2 s en pantalla para que se llegue a ver.
      const end = Math.min(Math.max(range.end, range.start + 1.2), outputDuration(segments));
      overlays.push({ file, kind: res.kind, start: range.start, end, layout: o.layout });
    }

    const assFile = join(dir, "subs.ass");
    await writeFile(assFile, toAss(buildCues(words, segments, new Set(plan.highlights), style.captions.wordsPerLine), style));

    const outFile = join(dir, "out.mp4");
    await render({ input: rawFile, output: outFile, segments, overlays, assFile, fontsDir: fontsDir() });

    const path = await uploadOutput(job, outFile, "mp4", "video/mp4");
    return {
      outputs: [{ path, type: "video" }],
      words,
      plan,
      duration: outputDuration(segments),
      summary: plan.summary,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
