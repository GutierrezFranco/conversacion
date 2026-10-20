import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { EditStyle } from "../lib/styles";
import type { Word } from "./timeline";

// Claude lee la transcripción palabra por palabra y decide qué queda, qué se destaca
// y dónde entra cada recurso. El render lo hace ffmpeg con este plan.

export const editPlanSchema = z.object({
  keep: z
    .array(
      z.object({
        fromWord: z.number().int().describe("Índice de la primera palabra del fragmento que queda"),
        toWord: z.number().int().describe("Índice de la última palabra del fragmento que queda (inclusive)"),
        zoom: z.boolean().describe("true para un acercamiento leve en este fragmento (énfasis)"),
      }),
    )
    .describe("Fragmentos que quedan, en orden. Todo lo que no esté acá se corta."),
  highlights: z.array(z.number().int()).describe("Índices de palabras a destacar con color en los subtítulos"),
  overlays: z
    .array(
      z.object({
        resource: z.number().int().describe("Número del recurso"),
        fromWord: z.number().int(),
        toWord: z.number().int(),
        layout: z.enum(["full", "top"]).describe("full: tapa toda la pantalla; top: tarjeta en la mitad de arriba"),
      }),
    )
    .describe("Cuándo se muestra cada recurso, anclado a las palabras en las que se menciona"),
  templates: z
    .array(
      z.object({
        template: z.number().int().describe("Número de la plantilla"),
        fromWord: z.number().int(),
        toWord: z.number().int(),
      }),
    )
    .describe("Cuándo se muestra cada plantilla. Incluí todas las plantillas que mandó el usuario."),
  labels: z
    .array(z.object({ text: z.string().describe("1 a 3 palabras, en mayúsculas"), fromWord: z.number().int(), toWord: z.number().int() }))
    .describe("Etiquetas cortas que escribís vos (por ejemplo PASO 1). Solo si el formato lo pide; si no, dejalo vacío."),
  summary: z.string().describe("Dos o tres oraciones, en español rioplatense, contándole al usuario qué se hizo"),
});

export type EditPlan = z.infer<typeof editPlanSchema>;

export type PlanResource = { index: number; kind: "image" | "video"; name: string; note: string };
export type PlanTemplate = { index: number; name: string; text: string; hint: string; note: string };

type PlanInput = {
  words: Word[];
  style: EditStyle;
  format: { name: string; direction: string; autoLabels: boolean };
  resources: PlanResource[];
  templates: PlanTemplate[];
  instructions: string;
  previous?: { plan: EditPlan; changes: string; mode: "fix" | "change" };
};

const SYSTEM = `Sos el editor de video de "Edición Simple". Editás reels verticales de técnicos de celulares y otros emprendedores que graban con el celular y no quieren perder horas editando.

Recibís la transcripción del video crudo con cada palabra numerada y su tiempo en segundos. Las líneas "— pausa X s —" marcan silencios. Devolvés un plan de edición.

LOS CORTES SON LO MÁS IMPORTANTE. Un corte malo arruina el reel y el usuario no lo paga. El resultado tiene que sonar como si lo hubiera dicho de corrido, sin un solo error:
- Tomas repetidas: la gente graba la misma frase varias veces hasta que sale. Cuando una frase (o una idea con otras palabras) aparece dos o más veces, quedate SOLO con la última toma completa y cortá TODAS las anteriores enteras, aunque parezcan bien. Buscá esto en todo el video, no solo en frases pegadas: a veces la repetición está a 10 o 20 segundos de distancia.
- Arranques en falso: si empieza una frase, se traba o la corta, y vuelve a empezar, cortá el intento fallido entero (desde su primera palabra).
- Errores: palabras equivocadas que después corrige ("cuatro, no, cinco"), tartamudeos, palabras cortadas a la mitad, frases que quedan sin terminar.
- Muletillas sueltas: "eh", "em", "mmm", "este", "o sea", "bueno" al principio sin sentido, "¿viste?" de relleno.
- Silencios: cada pausa larga va afuera. Los fragmentos de keep no deben cruzar una pausa de más de medio segundo: partilos ahí.
- Lo que se dice antes de arrancar o después de terminar ("¿ya está grabando?", "listo, corto") va afuera.
- Nunca cortes en medio de una idea ni dejes una frase a medias. Cada fragmento empieza y termina en palabras completas.
- Si dudás entre dejar o sacar algo que suena a error, sacalo.

Además:
- El gancho importa: si arranca con algo flojo y la frase fuerte viene después, podés empezar por la frase fuerte solo si la lógica se sigue entendiendo.
- highlights: entre 1 y 3 palabras clave por frase como máximo (números, beneficios, nombres de herramientas, la palabra que da el giro).
- zoom: usalo en fragmentos de énfasis, alternando para dar ritmo. No en todos.
- overlays: mostrá cada recurso justo cuando se lo menciona, según la nota del usuario. Solo usá palabras que hayas dejado en keep. Si una nota no tiene relación con lo que se dice, ubicá el recurso donde mejor encaje.
- templates: son carteles gráficos (cajita de preguntas, título gancho, precio, etiqueta, llamado a la acción). Ubicá cada una según su indicación y la nota del usuario. Que no se superpongan entre sí ni con un recurso en modo "top" al mismo tiempo.
- Seguí el estilo elegido y las indicaciones del usuario. Si piden algo imposible con estas herramientas, hacé lo más cercano y aclaralo en summary.`;

const PAUSE_MARK = 0.5;

// Una palabra por línea; los silencios largos entre palabras se marcan para que se vean.
export function formatWords(words: Word[]): string {
  const lines: string[] = [];
  words.forEach((w, k) => {
    const gap = k > 0 ? w.start - words[k - 1].end : 0;
    if (gap >= PAUSE_MARK) lines.push(`— pausa ${gap.toFixed(1)} s —`);
    lines.push(`${w.i}\t${w.start.toFixed(2)}\t${w.text}`);
  });
  return lines.join("\n");
}

// El texto que queda después de los cortes, con el número de cada palabra, para revisarlo.
function keptText(words: Word[], keep: EditPlan["keep"]): string {
  return keep
    .map((k, n) => {
      const text = words
        .slice(Math.max(0, k.fromWord), Math.min(words.length, k.toWord + 1))
        .map((w) => `${w.text}[${w.i}]`)
        .join(" ");
      return `Fragmento ${n + 1} (${k.fromWord}–${k.toWord}): ${text}`;
    })
    .join("\n");
}

const reviewSchema = z.object({
  problems: z.array(z.string()).describe("Cada error que encontraste en los cortes, en una línea. Vacío si está perfecto."),
  keep: editPlanSchema.shape.keep.describe("Los fragmentos corregidos. Si no hay problemas, los mismos que recibiste."),
});

const REVIEW_SYSTEM = `Sos el revisor de cortes de "Edición Simple". Otro editor ya eligió qué partes de un video quedan. Leés el texto final, de corrido, como lo va a escuchar la gente, y lo comparás con la transcripción completa.

Buscá y corregí:
- Frases o ideas que se escuchan dos veces (tomas repetidas): dejá solo la última toma.
- Arranques en falso, trabas, palabras cortadas o corregidas, frases que quedan sin terminar.
- Muletillas sueltas y lo que se dice antes de empezar o después de terminar.
- Fragmentos que cruzan una pausa larga.
- Cortes que dejan una idea a medias o que hacen que no se entienda.

No cambies cosas que estén bien: si el texto se escucha limpio y completo, devolvé los mismos fragmentos. Mantené el valor de zoom de cada fragmento que dejes.`;

async function reviewCuts(client: Anthropic, words: Word[], keep: EditPlan["keep"]): Promise<EditPlan["keep"]> {
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: betaZodOutputFormat(reviewSchema) },
    system: REVIEW_SYSTEM,
    messages: [
      {
        role: "user",
        content: `TEXTO FINAL (cada palabra con su número):\n${keptText(words, keep)}\n\nTRANSCRIPCIÓN COMPLETA (índice, segundo, palabra):\n${formatWords(words)}`,
      },
    ],
  });
  const out = response.parsed_output;
  // Si la revisión no vuelve bien, nos quedamos con los cortes originales en vez de fallar.
  if (response.stop_reason !== "end_turn" || !out || out.keep.length === 0) return keep;
  if (out.problems.length) console.log(`revisión de cortes: ${out.problems.length} arreglos`, out.problems);
  return out.keep;
}

export async function planEdit(input: PlanInput): Promise<EditPlan> {
  const client = new Anthropic();

  const parts = [
    `FORMATO: ${input.format.name}. ${input.format.direction}${input.format.autoLabels ? "" : " No agregues labels."}`,
    `ESTILO: ${input.style.name}. ${input.style.direction}`,
    input.resources.length
      ? `RECURSOS:\n${input.resources.map((r) => `${r.index}. ${r.kind === "video" ? "Video" : "Imagen"} "${r.name}": ${r.note || "(sin nota)"}`).join("\n")}`
      : "RECURSOS: ninguno.",
    input.templates.length
      ? `PLANTILLAS:\n${input.templates.map((t) => `${t.index}. ${t.name}: "${t.text}". ${t.hint}${t.note ? ` Nota del usuario: ${t.note}` : ""}`).join("\n")}`
      : "PLANTILLAS: ninguna.",
    input.instructions ? `INDICACIONES DEL USUARIO:\n${input.instructions}` : "",
    input.previous
      ? input.previous.mode === "fix"
        ? `EDICIÓN ANTERIOR (el usuario ya la vio y dice que quedaron ERRORES DE CORTE: repeticiones, trabas, silencios o frases mal cortadas):\n${JSON.stringify(input.previous.plan)}\n\n${input.previous.changes ? `LO QUE MARCÓ EL USUARIO:\n${input.previous.changes}\n\n` : ""}Volvé a revisar TODOS los cortes desde cero, palabra por palabra, y dejalos impecables. Mantené lo demás (highlights, recursos, plantillas) salvo que el usuario pida otra cosa.`
        : `EDICIÓN ANTERIOR (el usuario ya la vio):\n${JSON.stringify(input.previous.plan)}\n\nCAMBIOS QUE PIDE AHORA:\n${input.previous.changes}\n\nPartí de la edición anterior y aplicá solo esos cambios.`
      : "",
    `TRANSCRIPCIÓN (índice, segundo, palabra):\n${formatWords(input.words)}`,
  ].filter(Boolean);

  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: betaZodOutputFormat(editPlanSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: parts.join("\n\n") }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("La IA no pudo editar este video. Probá con otras indicaciones.");
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new Error("El plan de edición vino incompleto.");
  }
  const plan = response.parsed_output;
  // Segunda pasada: alguien que solo mira los cortes y los corrige.
  return { ...plan, keep: await reviewCuts(client, input.words, plan.keep) };
}
