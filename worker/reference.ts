import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { FONTS } from "../lib/fonts";
import { COPY_OPTIONS, type CopyOption } from "../lib/reference";
import { getStyle, STYLES } from "../lib/styles";
import { countCuts, extractFrames, probe, toJpeg } from "./media";
import { composeStyle, referenceAnalysisSchema } from "./reference-style";
import { db, download, type Job } from "./storage";

type ReferenceParams = { path: string; name: string; copy: CopyOption[]; details: string; baseStyleId: string };

const FRAMES = 8;
const MAX_SECONDS = 3 * 60;

const SYSTEM = `Analizás reels de referencia para "Edición Simple", un editor automático de videos verticales.
Mirás fotogramas de un video (o una captura) y describís su estilo de edición para poder copiarlo.

- Subtítulos: elegí la fuente MÁS PARECIDA de la lista que te paso (no podés usar otras). Fijate grosor, si es condensada, redondeada, manuscrita o con serifa. Medí colores con cuidado (#RRGGBB). Fijate si hay una palabra pintada de otro color que va cambiando entre fotogramas (eso es karaoke) o si el color marca palabras clave fijas (pop).
- Ritmo: con la cantidad de cortes por minuto y lo que ves, describí el ritmo para un editor.
- Lo que el usuario quiere copiar viene en casillas y en detalles escritos. Si los detalles contradicen las casillas, mandan los detalles (por ejemplo «de acá solo quiero los subtítulos»).
- Si no hay subtítulos visibles, poné present=false y contalo en analysis.`;

export async function runReference(job: Job): Promise<{ outputs: []; styleId: string; name: string }> {
  const params = job.params as ReferenceParams;
  const base = getStyle(params.baseStyleId) ?? STYLES[0];
  const dir = await mkdtemp(join(tmpdir(), "ref-"));
  try {
    const file = join(dir, "ref");
    await download("uploads", params.path, file);

    const isVideo = /\.(mp4|mov|m4v|webm)$/i.test(params.path);
    let frames: string[];
    let pacing = "Es una imagen fija: no hay información de ritmo.";
    if (isVideo) {
      const info = await probe(file);
      if (info.duration > MAX_SECONDS) throw new Error("La referencia dura más de 3 minutos. Subí un reel más corto.");
      frames = await extractFrames(file, info.duration, FRAMES, join(dir, "f"));
      const cuts = await countCuts(file);
      pacing = `Dura ${info.duration.toFixed(0)} s y tiene ${cuts} cortes de cámara (${((cuts / info.duration) * 60).toFixed(0)} por minuto).`;
    } else {
      const jpg = join(dir, "ref.jpg");
      await toJpeg(file, jpg);
      frames = [jpg];
    }

    const images = await Promise.all(
      frames.map(async (f) => ({
        type: "image" as const,
        source: { type: "base64" as const, media_type: "image/jpeg" as const, data: (await readFile(f)).toString("base64") },
      })),
    );

    const fonts = FONTS.map((f) => `- ${f.ass}: ${f.looks}`).join("\n");
    const wanted = COPY_OPTIONS.map((o) => `- ${o.label} (${o.hint}): ${params.copy.includes(o.id) ? "sí" : "no"}`).join("\n");
    const text = [
      isVideo ? `Estos son ${frames.length} fotogramas en orden de un reel de referencia.` : "Esta es una captura de referencia.",
      pacing,
      `FUENTES DISPONIBLES:\n${fonts}`,
      `QUÉ QUIERE COPIAR (casillas):\n${wanted}`,
      params.details ? `DETALLES DEL USUARIO:\n${params.details}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: betaZodOutputFormat(referenceAnalysisSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: [...images, { type: "text", text }] }],
    });
    if (response.stop_reason === "refusal") throw new Error("No pudimos analizar esta referencia. Probá con otra.");
    const analysis = response.parsed_output;
    if (!analysis) throw new Error("El análisis de la referencia vino incompleto.");

    const { data: row, error: insertError } = await db
      .from("custom_styles")
      .insert({
        user_id: job.user_id,
        name: analysis.name.slice(0, 40),
        style: {},
        copied: (Object.keys(analysis.copy) as CopyOption[]).filter((k) => analysis.copy[k]),
        analysis: analysis.analysis,
        source_job_id: job.id,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    const style = composeStyle(base, analysis, `custom:${row.id}`);
    const { error } = await db.from("custom_styles").update({ style }).eq("id", row.id);
    if (error) throw error;

    return { outputs: [], styleId: style.id, name: style.name };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
