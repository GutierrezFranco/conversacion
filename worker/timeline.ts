// Lógica pura de la edición: de palabras + plan a segmentos, tiempos y subtítulos.
// No toca archivos ni red, así se puede testear entera.

import type { EditStyle } from "../lib/styles";

export type Word = { i: number; text: string; start: number; end: number };
export type KeepRange = { fromWord: number; toWord: number; zoom: boolean };
export type Segment = { start: number; end: number; zoom: boolean; outStart: number };

const PAD_BEFORE = 0.08;
const PAD_AFTER = 0.15;
const MIN_SEGMENT = 0.25;

// Convierte los rangos de palabras que eligió Claude en cortes del video original.
export function buildSegments(words: Word[], keep: KeepRange[], sourceDuration: number): Segment[] {
  const ranges = keep
    .map((k) => ({ ...k, fromWord: Math.max(0, k.fromWord), toWord: Math.min(words.length - 1, k.toWord) }))
    .filter((k) => k.fromWord <= k.toWord)
    .sort((a, b) => a.fromWord - b.fromWord);

  const raw: Omit<Segment, "outStart">[] = [];
  for (const r of ranges) {
    const first = words[r.fromWord];
    const last = words[r.toWord];
    const prevEnd = r.fromWord > 0 ? words[r.fromWord - 1].end : 0;
    const nextStart = r.toWord < words.length - 1 ? words[r.toWord + 1].start : sourceDuration;
    const start = Math.max(prevEnd, first.start - PAD_BEFORE, 0);
    const end = Math.min(nextStart, last.end + PAD_AFTER, sourceDuration);
    if (end - start < MIN_SEGMENT) continue;

    const prev = raw[raw.length - 1];
    // Rangos pegados o superpuestos se unen para no generar cortes invisibles.
    if (prev && start <= prev.end + 0.05 && prev.zoom === r.zoom) {
      prev.end = Math.max(prev.end, end);
    } else if (prev && start < prev.end) {
      raw.push({ start: prev.end, end, zoom: r.zoom });
    } else {
      raw.push({ start, end, zoom: r.zoom });
    }
  }

  let t = 0;
  return raw
    .filter((s) => s.end - s.start >= MIN_SEGMENT)
    .map((s) => {
      const seg = { ...s, outStart: t };
      t += s.end - s.start;
      return seg;
    });
}

export function outputDuration(segments: Segment[]): number {
  const last = segments[segments.length - 1];
  return last ? last.outStart + (last.end - last.start) : 0;
}

// Tiempo del original → tiempo del video editado. null si ese momento fue cortado.
export function mapTime(segments: Segment[], t: number): number | null {
  for (const s of segments) {
    if (t >= s.start && t <= s.end) return s.outStart + (t - s.start);
  }
  return null;
}

// Intervalo en tiempo del video editado que ocupan las palabras [from, to] (las que quedaron).
export function mapWordRange(words: Word[], segments: Segment[], from: number, to: number): { start: number; end: number } | null {
  const times: number[] = [];
  for (let i = Math.max(0, from); i <= Math.min(words.length - 1, to); i++) {
    const s = mapTime(segments, (words[i].start + words[i].end) / 2);
    if (s === null) continue;
    const a = mapTime(segments, words[i].start) ?? s;
    const b = mapTime(segments, words[i].end) ?? s;
    times.push(a, b);
  }
  if (times.length === 0) return null;
  return { start: Math.min(...times), end: Math.max(...times) };
}

export type Cue = { start: number; end: number; words: { text: string; highlight: boolean }[] };

// Agrupa las palabras que quedaron en líneas cortas de subtítulos.
export function buildCues(words: Word[], segments: Segment[], highlights: Set<number>, wordsPerLine: number): Cue[] {
  const cues: Cue[] = [];
  let current: Cue | null = null;
  let lastEnd = -1;

  for (const w of words) {
    const start = mapTime(segments, w.start + 0.01);
    const end = mapTime(segments, w.end - 0.01);
    if (start === null || end === null) continue;

    const gap = start - lastEnd;
    const endsSentence = current && /[.!?…]$/.test(current.words[current.words.length - 1].text);
    if (!current || current.words.length >= wordsPerLine || gap > 0.6 || endsSentence) {
      if (current) cues.push(current);
      current = { start, end, words: [] };
    }
    current.words.push({ text: w.text, highlight: highlights.has(w.i) });
    current.end = end;
    lastEnd = end;
  }
  if (current) cues.push(current);

  // Cada subtítulo queda en pantalla hasta que arranca el siguiente (sin parpadeos).
  for (let i = 0; i < cues.length - 1; i++) {
    if (cues[i + 1].start - cues[i].end < 0.4) cues[i].end = cues[i + 1].start;
  }
  return cues;
}

function assTime(t: number): string {
  const cs = Math.max(0, Math.round(t * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}

function escapeAss(text: string): string {
  return text.replace(/\\/g, "").replace(/[{}]/g, "").replace(/\n/g, " ");
}

// Genera el archivo .ass que ffmpeg dibuja encima del video.
export function toAss(cues: Cue[], style: EditStyle): string {
  const c = style.captions;
  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Main,${c.font},${c.size},${c.primary},${c.highlight},${c.outline},&H64000000,0,0,0,0,100,100,0,0,1,${c.outlineWidth},0,2,80,80,${c.marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const lines = cues.map((cue) => {
    const text = cue.words
      .map((w) => {
        let t = escapeAss(w.text.trim());
        if (c.uppercase) t = t.toLocaleUpperCase("es");
        return w.highlight ? `{\\c${c.highlight}}${t}{\\c${c.primary}}` : t;
      })
      .join(" ");
    // Pequeño "pop" al aparecer cada subtítulo.
    const pop = "{\\fscx85\\fscy85\\t(0,90,\\fscx100\\fscy100)}";
    return `Dialogue: 0,${assTime(cue.start)},${assTime(cue.end)},Main,,0,0,0,,${pop}${text}`;
  });

  return [...header, ...lines, ""].join("\n");
}
