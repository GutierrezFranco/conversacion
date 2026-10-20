// Convierte lo que la IA detectó en una referencia en un estilo de edición que el worker sabe
// dibujar. Lógica pura: se testea sin llamar a la IA.

import { z } from "zod";
import { FONTS } from "../lib/fonts";
import type { CopyOption } from "../lib/reference";
import { hexToAss, type EditStyle } from "../lib/styles";

const hex = z.string().describe("Color en formato #RRGGBB");

export const referenceAnalysisSchema = z.object({
  name: z.string().describe("Nombre corto para el estilo, 2 a 4 palabras. Ej: «Amarillo palabra por palabra»"),
  analysis: z.string().describe("Dos o tres oraciones, en español rioplatense, contando qué detectaste y qué se copió"),
  copy: z.object({
    subtitulos: z.boolean(),
    animacion: z.boolean(),
    ritmo: z.boolean(),
  }).describe("Qué se copia finalmente de la referencia"),
  captions: z.object({
    present: z.boolean().describe("false si la referencia no tiene subtítulos visibles"),
    font: z.enum(FONTS.map((f) => f.ass) as [string, ...string[]]).describe("La fuente de la lista más parecida a la de la referencia"),
    size: z.enum(["chico", "mediano", "grande", "enorme"]),
    textColor: hex,
    highlightColor: hex.describe("Color de la palabra destacada o activa. Si no hay, el mismo que textColor"),
    outline: z.enum(["no", "fino", "grueso"]),
    outlineColor: hex,
    box: z.boolean().describe("true si el texto va sobre una caja o fondo de color"),
    boxColor: hex,
    uppercase: z.boolean(),
    position: z.enum(["arriba", "media-alta", "centro", "media-baja", "abajo"]),
    wordsPerLine: z.number().int().describe("Cuántas palabras se ven a la vez, de 1 a 6"),
    animation: z.enum(["pop", "karaoke", "none"]).describe("karaoke: se pinta la palabra que se dice · pop: cada línea aparece con un rebote · none: fijas"),
  }),
  pacing: z.object({
    direction: z.string().describe("Indicación para el editor sobre ritmo de cortes y zooms, en una o dos oraciones"),
    zooms: z.boolean(),
  }),
});

export type ReferenceAnalysis = z.infer<typeof referenceAnalysisSchema>;

const SIZES = { chico: 58, mediano: 72, grande: 88, enorme: 110 } as const;
// Distancia desde abajo (sobre 1920) según dónde está el subtítulo.
const POSITIONS = { arriba: 1420, "media-alta": 1120, centro: 860, "media-baja": 560, abajo: 300 } as const;
const OUTLINES = { no: 0, fino: 3, grueso: 7 } as const;

export function composeStyle(base: EditStyle, a: ReferenceAnalysis, id: string): EditStyle {
  const copy: CopyOption[] = (Object.keys(a.copy) as CopyOption[]).filter((k) => a.copy[k]);
  const captions = { ...base.captions };

  if (copy.includes("subtitulos") && a.captions.present) {
    const font = FONTS.find((f) => f.ass === a.captions.font);
    captions.font = a.captions.font;
    captions.italic = font?.italic ?? false;
    captions.size = SIZES[a.captions.size];
    captions.primary = hexToAss(a.captions.textColor);
    captions.highlight = hexToAss(a.captions.highlightColor);
    captions.uppercase = a.captions.uppercase;
    captions.marginV = POSITIONS[a.captions.position];
    captions.wordsPerLine = Math.min(6, Math.max(1, a.captions.wordsPerLine));
    captions.box = a.captions.box;
    if (a.captions.box) {
      captions.outline = hexToAss(a.captions.boxColor);
      captions.outlineWidth = 14; // margen interno de la caja
    } else {
      captions.outline = hexToAss(a.captions.outlineColor);
      captions.outlineWidth = OUTLINES[a.captions.outline];
    }
  }
  if (copy.includes("animacion") && a.captions.present) {
    captions.animation = a.captions.animation;
  }

  const direction = copy.includes("ritmo")
    ? `${a.pacing.direction}${a.pacing.zooms ? "" : " No uses zooms."}`
    : base.direction;

  return {
    id,
    name: a.name.slice(0, 40),
    tagline: "Tu referencia",
    description: a.analysis.slice(0, 300),
    direction,
    // Los estilos copiados se dibujan con el motor premium, que reproduce mejor la referencia.
    engine: "hyperframes",
    captions,
  };
}
