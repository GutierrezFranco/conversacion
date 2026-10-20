import { test } from "node:test";
import assert from "node:assert/strict";
import { placeTemplates, templateEvents, wrap } from "./templates";
import { normalizeInstance } from "../lib/templates";

const pregunta = normalizeInstance({ templateId: "pregunta", values: { pregunta: "¿Conviene cambiar el módulo?" }, note: "" });
const cta = normalizeInstance({ templateId: "cta", values: { texto: "Escribime" }, note: "" });

test("completa los opcionales y valida los obligatorios", () => {
  assert.equal(pregunta.values.titulo, "Me preguntaron");
  assert.throws(() => normalizeInstance({ templateId: "precio", values: { servicio: "Pantalla" }, note: "" }), /Precio/);
  assert.throws(() => normalizeInstance({ templateId: "nope", values: {}, note: "" }));
});

test("usa la posición de Claude cuando las palabras quedaron", () => {
  const [p] = placeTemplates([pregunta], [{ template: 0, fromWord: 2, toWord: 4 }], () => ({ start: 1, end: 4 }), 20);
  assert.deepEqual([p.start, p.end], [1, 4]);
});

test("si Claude no la ubicó, va al principio o al final", () => {
  const placed = placeTemplates([pregunta, cta], [], () => null, 20);
  assert.equal(placed[0].start, 0);
  assert.equal(placed[1].end, 20);
  assert.equal(placed[1].start, 16.5);
});

test("nunca se sale del video", () => {
  const [p] = placeTemplates([cta], [], () => null, 2);
  assert.ok(p.start >= 0 && p.end <= 2 && p.end > p.start);
});

test("corta el texto en líneas y escapa llaves", () => {
  assert.deepEqual(wrap("uno dos tres cuatro", 8), ["uno dos", "tres", "cuatro"]);
  const evil = normalizeInstance({ templateId: "etiqueta", values: { texto: "{\\pos(0,0)}hola" }, note: "" });
  const lines = templateEvents(evil, { start: "0:00:00.00", end: "0:00:01.00" });
  assert.ok(lines.every((l) => !l.includes("\\POS")));
  assert.ok(lines.some((l) => l.endsWith("HOLA")));
});
