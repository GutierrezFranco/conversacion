import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCues, buildSegments, mapTime, mapWordRange, outputDuration, toAss, type Word } from "./timeline";
import { formatWords } from "./plan";
import { STYLES } from "../lib/styles";

// "hola soy franco eh eh hoy te muestro algo" con una pausa larga en el medio.
const words: Word[] = [
  { i: 0, text: "Hola,", start: 0.5, end: 0.9 },
  { i: 1, text: "soy", start: 1.0, end: 1.2 },
  { i: 2, text: "Franco.", start: 1.25, end: 1.8 },
  { i: 3, text: "eh", start: 3.0, end: 3.2 },
  { i: 4, text: "eh", start: 3.4, end: 3.6 },
  { i: 5, text: "Hoy", start: 5.0, end: 5.3 },
  { i: 6, text: "te", start: 5.35, end: 5.5 },
  { i: 7, text: "muestro", start: 5.55, end: 6.0 },
  { i: 8, text: "algo.", start: 6.05, end: 6.5 },
];

test("corta muletillas y silencios", () => {
  const segs = buildSegments(words, [
    { fromWord: 0, toWord: 2, zoom: false },
    { fromWord: 5, toWord: 8, zoom: true },
  ], 8);
  assert.equal(segs.length, 2);
  assert.ok(Math.abs(segs[0].start - 0.42) < 1e-9);
  assert.ok(Math.abs(segs[0].end - 1.95) < 1e-9);
  assert.equal(segs[1].zoom, true);
  assert.ok(Math.abs(segs[1].outStart - 1.53) < 1e-9);
  assert.ok(Math.abs(outputDuration(segs) - (1.53 + 1.73)) < 1e-9);
});

test("une rangos contiguos con el mismo zoom", () => {
  const segs = buildSegments(words, [
    { fromWord: 5, toWord: 6, zoom: false },
    { fromWord: 7, toWord: 8, zoom: false },
  ], 8);
  assert.equal(segs.length, 1);
});

test("ignora índices fuera de rango y rangos invertidos", () => {
  const segs = buildSegments(words, [
    { fromWord: 7, toWord: 99, zoom: false },
    { fromWord: 4, toWord: 2, zoom: false },
  ], 8);
  assert.equal(segs.length, 1);
  assert.ok(segs[0].end <= 8);
});

test("mapea tiempos del original al editado", () => {
  const segs = buildSegments(words, [
    { fromWord: 0, toWord: 2, zoom: false },
    { fromWord: 5, toWord: 8, zoom: false },
  ], 8);
  assert.equal(mapTime(segs, 3.1), null); // la muletilla se cortó
  const t = mapTime(segs, 5.0)!;
  assert.ok(Math.abs(t - (1.53 + 0.08)) < 1e-9);
  const r = mapWordRange(words, segs, 5, 8)!;
  assert.ok(r.start < r.end);
});

test("arma subtítulos sin las palabras cortadas", () => {
  const segs = buildSegments(words, [
    { fromWord: 0, toWord: 2, zoom: false },
    { fromWord: 5, toWord: 8, zoom: false },
  ], 8);
  const cues = buildCues(words, segs, new Set([7]), 3);
  const text = cues.map((c) => c.words.map((w) => w.text).join(" "));
  assert.deepEqual(text, ["Hola, soy Franco.", "Hoy te muestro", "algo."]);
  assert.equal(cues[1].words[2].highlight, true);
  for (let i = 1; i < cues.length; i++) assert.ok(cues[i].start >= cues[i - 1].end - 1e-9);
});

test("genera un ASS válido con destacados", () => {
  const segs = buildSegments(words, [{ fromWord: 5, toWord: 8, zoom: false }], 8);
  const style = STYLES.find((s) => s.id === "tech")!;
  const ass = toAss(buildCues(words, segs, new Set([7]), 3), style);
  assert.match(ass, /PlayResY: 1920/);
  assert.match(ass, /Dialogue: 0,0:00:00\.\d\d,/);
  assert.match(ass, /MUESTRO/);
  assert.ok(ass.includes(`{\\c${style.captions.highlight}}MUESTRO`));
});

test("modo karaoke: un evento por palabra con la palabra activa pintada", () => {
  const segs = buildSegments(words, [{ fromWord: 5, toWord: 8, zoom: false }], 8);
  const base = STYLES.find((s) => s.id === "tech")!;
  const style = { ...base, captions: { ...base.captions, animation: "karaoke" as const, box: true } };
  const ass = toAss(buildCues(words, segs, new Set(), 4), style);
  const events = ass.split("\n").filter((l) => l.startsWith("Dialogue"));
  assert.equal(events.length, 4);
  assert.ok(events[1].includes(`{\\c${style.captions.highlight}}TE`));
  assert.match(ass, /,3,6,0,2,80,80,/); // BorderStyle 3 = caja
});

test("los silencios del audio se sacan aunque queden dentro de un fragmento", () => {
  const ws: Word[] = [
    { i: 0, text: "uno", start: 0.0, end: 0.5 },
    { i: 1, text: "dos", start: 2.0, end: 2.5 },
  ];
  const segs = buildSegments(ws, [{ fromWord: 0, toWord: 1, zoom: false }], 3, [{ start: 0.6, end: 1.9 }]);
  assert.equal(segs.length, 2);
  // Queda un poco de aire a cada lado del silencio y el corte es más corto que el original.
  assert.ok(Math.abs(segs[0].end - 0.72) < 0.01);
  assert.ok(Math.abs(segs[1].start - 1.78) < 0.01);
  assert.ok(outputDuration(segs) < 2);
  // Un silencio corto no se toca.
  assert.equal(buildSegments(ws, [{ fromWord: 0, toWord: 1, zoom: false }], 3, [{ start: 0.6, end: 0.9 }]).length, 1);
});

test("la transcripción para Claude marca las pausas largas", () => {
  const text = formatWords([
    { i: 0, text: "hola", start: 0, end: 0.4 },
    { i: 1, text: "che", start: 2.1, end: 2.4 },
  ]);
  assert.match(text, /— pausa 1\.7 s —/);
});
