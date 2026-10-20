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
  summary: z.string().describe("Dos o tres oraciones, en español rioplatense, contándole al usuario qué se hizo"),
});

export type EditPlan = z.infer<typeof editPlanSchema>;

export type PlanResource = { index: number; kind: "image" | "video"; name: string; note: string };

type PlanInput = {
  words: Word[];
  style: EditStyle;
  resources: PlanResource[];
  instructions: string;
  previous?: { plan: EditPlan; changes: string };
};

const SYSTEM = `Sos el editor de video de "Edición Simple". Editás reels verticales para creadores de contenido que graban con el celular y no saben editar.

Recibís la transcripción del video crudo con cada palabra numerada y su tiempo en segundos. Devolvés un plan de edición:
- keep: los fragmentos que quedan, por índice de palabra. Cortá errores, frases repetidas (quedate con la mejor toma, casi siempre la última), muletillas ("eh", "este", "o sea" sueltos), arranques en falso y silencios. Nunca cortes en medio de una idea. El resultado tiene que entenderse solo.
- El gancho importa: si el usuario arranca con algo flojo y la frase fuerte viene después, podés empezar por la frase fuerte solo si la lógica del video se sigue entendiendo.
- highlights: entre 1 y 3 palabras clave por frase como máximo (números, beneficios, nombres de herramientas, la palabra que da el giro).
- zoom: usalo en fragmentos de énfasis, alternando para dar ritmo. No en todos.
- overlays: mostrá cada recurso justo cuando se lo menciona, según la nota del usuario. Solo usá palabras que hayas dejado en keep. Si una nota no tiene relación con lo que se dice, ubicá el recurso donde mejor encaje.
- Seguí el estilo elegido y las indicaciones del usuario. Si piden algo imposible con estas herramientas, hacé lo más cercano y aclaralo en summary.`;

function formatWords(words: Word[]): string {
  return words.map((w) => `${w.i}\t${w.start.toFixed(2)}\t${w.text}`).join("\n");
}

export async function planEdit(input: PlanInput): Promise<EditPlan> {
  const client = new Anthropic();

  const parts = [
    `ESTILO: ${input.style.name}. ${input.style.direction}`,
    input.resources.length
      ? `RECURSOS:\n${input.resources.map((r) => `${r.index}. ${r.kind === "video" ? "Video" : "Imagen"} "${r.name}": ${r.note || "(sin nota)"}`).join("\n")}`
      : "RECURSOS: ninguno.",
    input.instructions ? `INDICACIONES DEL USUARIO:\n${input.instructions}` : "",
    input.previous
      ? `EDICIÓN ANTERIOR (el usuario ya la vio):\n${JSON.stringify(input.previous.plan)}\n\nCAMBIOS QUE PIDE AHORA:\n${input.previous.changes}\n\nPartí de la edición anterior y aplicá solo esos cambios.`
      : "",
    `TRANSCRIPCIÓN (índice, segundo, palabra):\n${formatWords(input.words)}`,
  ].filter(Boolean);

  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: betaZodOutputFormat(editPlanSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: parts.join("\n\n") }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("La IA no pudo editar este video. Probá con otras indicaciones.");
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new Error("El plan de edición vino incompleto.");
  }
  return response.parsed_output;
}
