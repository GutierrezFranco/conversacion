// Qué se puede copiar de una referencia. Lo comparten el editor (casillas) y el worker.

export const COPY_OPTIONS = [
  { id: "subtitulos", label: "Subtítulos", hint: "fuente, tamaño, colores, posición y caja" },
  { id: "animacion", label: "Animación de palabras", hint: "cómo aparecen: de a una, con rebote, fijas" },
  { id: "ritmo", label: "Ritmo y zooms", hint: "qué tan rápido corta y cuándo acerca" },
] as const;

export type CopyOption = (typeof COPY_OPTIONS)[number]["id"];
export const COPY_IDS = COPY_OPTIONS.map((o) => o.id) as [CopyOption, ...CopyOption[]];
