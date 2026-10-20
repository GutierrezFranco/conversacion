import { test } from "node:test";
import assert from "node:assert/strict";
import { jobInput, ownsPath, resolveJob } from "./jobs";
import { EDIT_CREDITS, creditsFor } from "./pricing";

test("el precio de una edición sale del servidor", () => {
  const input = jobInput.parse({ kind: "edit", rawPath: "u1/crudo.mp4", styleId: "tech" });
  if (input.kind === "iterate") throw new Error("tipo inesperado");
  assert.equal(resolveJob(input).cost, EDIT_CREDITS);
});

test("rechaza estilos y modelos inexistentes", () => {
  assert.throws(() => resolveJob({ kind: "edit", title: "x", rawPath: "u/a", styleId: "nope", resources: [], instructions: "" }));
  assert.throws(() => resolveJob({ kind: "image", modelId: "nope", prompt: "hola mundo", aspectRatio: "1:1", count: 1 }));
});

test("rechaza duraciones que el modelo no ofrece", () => {
  assert.throws(() => resolveJob({ kind: "video", modelId: "kling", prompt: "una ciudad", aspectRatio: "9:16", seconds: 7 }));
});

test("cobra al menos 1 crédito y aplica el margen", () => {
  assert.equal(creditsFor(0), 1);
  assert.equal(creditsFor(0.1), 6);
});

test("ownsPath bloquea archivos de otros usuarios", () => {
  assert.equal(ownsPath("u1", "u1/video.mp4"), true);
  assert.equal(ownsPath("u1", "u2/video.mp4"), false);
  assert.equal(ownsPath("u1", "u1/../u2/video.mp4"), false);
});
