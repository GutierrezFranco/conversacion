import { test } from "node:test";
import assert from "node:assert/strict";
import { shade, wrapText } from "./stickers";

test("shade aclara y oscurece colores", () => {
  assert.equal(shade("#808080", -0.5), "#404040");
  assert.equal(shade("#000000", 0.5), "#808080");
  assert.equal(shade("nope", 0.5), "nope");
});

test("wrapText corta por ancho y respeta saltos de línea", () => {
  // Contexto falso: cada carácter mide 10 px.
  const ctx = { measureText: (t: string) => ({ width: t.length * 10 }) } as unknown as CanvasRenderingContext2D;
  assert.deepEqual(wrapText(ctx, "uno dos tres", 75), ["uno dos", "tres"]);
  assert.deepEqual(wrapText(ctx, "hola\nchau", 1000), ["hola", "chau"]);
});
