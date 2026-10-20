// Estilos de edición. Cada uno define cómo se ven los subtítulos y cómo tiene que cortar Claude.
// Los colores van en formato ASS (&HBBGGRR), que es lo que usa ffmpeg para dibujar subtítulos.

export type EditStyle = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  // Indicaciones para Claude sobre ritmo y tono de la edición.
  direction: string;
  captions: {
    font: string;
    size: number;
    primary: string; // color del texto
    highlight: string; // color de la palabra destacada
    outline: string;
    outlineWidth: number;
    uppercase: boolean;
    wordsPerLine: number;
    marginV: number; // distancia desde abajo, en píxeles sobre 1920
    italic?: boolean;
    box?: boolean; // texto sobre una caja de color (usa `outline` como color de la caja)
    shadow?: number;
    // pop: cada línea aparece con un rebote · karaoke: se pinta la palabra que se está diciendo
    animation?: "pop" | "none" | "karaoke";
  };
};

// Colores: la web y la IA trabajan en #RRGGBB; ffmpeg (ASS) en &HAABBGGRR.
export function hexToAss(hex: string, alpha = 0): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const h = m ? m[1] : "FFFFFF";
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255).toString(16).padStart(2, "0");
  return `&H${a}${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase();
}

export function assToHex(ass: string): string {
  const m = /^&H([0-9a-f]{2})?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})&?$/i.exec(ass.trim());
  if (!m) return "#FFFFFF";
  return `#${m[4]}${m[3]}${m[2]}`.toUpperCase();
}

export const STYLES: EditStyle[] = [
  {
    id: "tech",
    name: "Tech Cinemático",
    tagline: "Reparaciones paso a paso",
    description: "Cortes rápidos, subtítulos grandes y tus fotos en el momento justo. Ideal para mostrar una reparación.",
    direction:
      "Ritmo rápido. Sacá todas las pausas y muletillas. Mostrá los recursos (capturas, pantallas) exactamente cuando se mencionan. Destacá nombres de herramientas, números y resultados.",
    captions: {
      font: "Poppins ExtraBold",
      size: 86,
      primary: "&H00FFFFFF",
      highlight: "&H0000A5FF",
      outline: "&H00000000",
      outlineWidth: 6,
      uppercase: true,
      wordsPerLine: 3,
      marginV: 520,
    },
  },
  {
    id: "golden",
    name: "Golden Hour",
    tagline: "Cálido y cercano",
    description: "Ritmo tranquilo, subtítulos suaves en tonos cálidos. Para historias y reflexiones.",
    direction:
      "Ritmo medio. Sacá errores y silencios largos pero dejá respirar las frases importantes. Destacá palabras emocionales.",
    captions: {
      font: "Poppins SemiBold",
      size: 72,
      primary: "&H00F0F8FF",
      highlight: "&H0055C8FF",
      outline: "&H00203040",
      outlineWidth: 4,
      uppercase: false,
      wordsPerLine: 4,
      marginV: 480,
    },
  },
  {
    id: "impacto",
    name: "Impacto",
    tagline: "Promos y precios",
    description: "Frases cortas, una o dos palabras por pantalla y destacados fuertes. Para ofertas y servicios.",
    direction:
      "Ritmo muy rápido, estilo anuncio. Cortes agresivos entre frases. Destacá beneficios, precios, llamados a la acción.",
    captions: {
      font: "Anton",
      size: 120,
      primary: "&H00FFFFFF",
      highlight: "&H0000E1FF",
      outline: "&H00000000",
      outlineWidth: 8,
      uppercase: true,
      wordsPerLine: 2,
      marginV: 760,
    },
  },
  {
    id: "storytelling",
    name: "Storytelling",
    tagline: "Casos y anécdotas",
    description: "Subtítulos claros y cortes limpios para contar el caso del cliente o cómo arrancaste.",
    direction:
      "Ritmo natural. Respetá la narración: sacá solo errores, repeticiones y silencios muy largos. Destacá el giro de la historia.",
    captions: {
      font: "Poppins Bold",
      size: 70,
      primary: "&H00FFFFFF",
      highlight: "&H004BB8F5",
      outline: "&H00000000",
      outlineWidth: 4,
      uppercase: false,
      wordsPerLine: 4,
      marginV: 420,
    },
  },
  {
    id: "podcast",
    name: "Clip de podcast",
    tagline: "Consejos y respuestas",
    description: "Subtítulos muy legibles para videos donde explicás o respondés preguntas.",
    direction:
      "Encontrá el fragmento más fuerte y autocontenido. Cortes mínimos dentro de las frases. Destacá la idea central.",
    captions: {
      font: "Poppins Bold",
      size: 64,
      primary: "&H00FFFFFF",
      highlight: "&H0000D7FF",
      outline: "&H00000000",
      outlineWidth: 3,
      uppercase: false,
      wordsPerLine: 5,
      marginV: 360,
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    tagline: "Limpio y sin vueltas",
    description: "Sin distracciones: cortes prolijos y subtítulos chicos. Que se luzca lo que decís.",
    direction: "Ritmo natural. Solo limpiá errores y silencios. Usá pocos destacados.",
    captions: {
      font: "Poppins Medium",
      size: 56,
      primary: "&H00FFFFFF",
      highlight: "&H00FFFFFF",
      outline: "&H80000000",
      outlineWidth: 2,
      uppercase: false,
      wordsPerLine: 5,
      marginV: 300,
    },
  },
];

export function getStyle(id: string): EditStyle | undefined {
  return STYLES.find((s) => s.id === id);
}
