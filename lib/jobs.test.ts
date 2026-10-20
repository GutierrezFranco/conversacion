import { test } from "node:test";
import assert from "node:assert/strict";
import { jobInput, ownsPath, resolveJob } from "./jobs";
import { STYLES } from "./styles";
import { CREDIT_PRICE_ARS, EDIT_CREDITS, ITERATION_CREDITS, PACKS, PREMIUM_EDIT_CREDITS, creditsFor, pricePerVideo } from "./pricing";

test("el precio de una edición sale del servidor", () => {
  const input = jobInput.parse({ kind: "edit", rawPath: "u1/raw/crudo.mp4", styleId: "tech" });
  if (input.kind === "iterate") throw new Error("tipo inesperado");
  assert.equal(resolveJob(input).cost, EDIT_CREDITS);
});

test("rechaza estilos y modelos inexistentes", () => {
  assert.throws(() => resolveJob({ kind: "edit", title: "x", rawPath: "u/a", styleId: "nope", formatId: "camara", resources: [], templates: [], instructions: "" }));
  assert.throws(() => resolveJob({ kind: "image", modelId: "nope", prompt: "hola mundo", aspectRatio: "1:1", count: 1 }));
});

test("rechaza duraciones que el modelo no ofrece", () => {
  assert.throws(() => resolveJob({ kind: "video", modelId: "kling", prompt: "una ciudad", aspectRatio: "9:16", seconds: 7 }));
});

test("cobra al menos 1 crédito y aplica el margen", () => {
  assert.equal(creditsFor(0, 1450), 1);
  // US$0,50 × $1.000 × 3 = $1.500 = 3 créditos de $500
  assert.equal(creditsFor(0.5, 1000), 3);
});

test("los paquetes salen $5.000 por video o menos", () => {
  for (const p of PACKS) assert.ok(pricePerVideo(p) <= 5000);
  assert.equal(EDIT_CREDITS * CREDIT_PRICE_ARS, 5000);
  assert.equal((EDIT_CREDITS + ITERATION_CREDITS) * CREDIT_PRICE_ARS, 7500);
});

test("ownsPath bloquea archivos de otros usuarios", () => {
  assert.equal(ownsPath("u1", "u1/video.mp4"), true);
  assert.equal(ownsPath("u1", "u2/video.mp4"), false);
  assert.equal(ownsPath("u1", "u1/../u2/video.mp4"), false);
  assert.equal(ownsPath("u1", "u1/raw/a.mp4", "assets"), false);
  assert.equal(ownsPath("u1", "u1/assets/a.png", "assets"), true);
});

test("las plantillas se validan y completan en el servidor", () => {
  const input = jobInput.parse({
    kind: "edit",
    rawPath: "u1/raw/a.mp4",
    styleId: "tech",
    templates: [{ templateId: "pregunta", values: { pregunta: "¿Se puede?" } }],
  });
  if (input.kind !== "edit") throw new Error("tipo inesperado");
  const job = resolveJob(input);
  assert.deepEqual((job.params.templates as { values: Record<string, string> }[])[0].values, { titulo: "Me preguntaron", pregunta: "¿Se puede?" });
  assert.throws(() => resolveJob({ ...input, templates: [{ templateId: "precio", values: {}, note: "" }] }));
});

test("los estilos propios se copian en el trabajo y deben coincidir con el pedido", () => {
  const input = jobInput.parse({ kind: "edit", rawPath: "u1/raw/a.mp4", styleId: "custom:abc", formatId: "pasos" });
  if (input.kind !== "edit") throw new Error("tipo inesperado");
  assert.throws(() => resolveJob(input)); // sin el estilo cargado
  const custom = { ...STYLES[0], id: "custom:abc", name: "Mío" };
  const job = resolveJob(input, custom);
  assert.equal((job.params.style as { name: string }).name, "Mío");
  assert.equal(job.params.formatId, "pasos");
  assert.throws(() => resolveJob(input, { ...custom, id: "custom:otro" }));
  assert.throws(() => resolveJob({ ...input, formatId: "nope" }, custom));
});

test("analizar una referencia es gratis y valida qué se copia", () => {
  const input = jobInput.parse({ kind: "reference", path: "u1/refs/r.mp4", name: "ref.mp4", details: "solo los subtítulos" });
  if (input.kind !== "reference") throw new Error("tipo inesperado");
  assert.deepEqual(input.copy, ["subtitulos", "animacion", "ritmo"]);
  assert.equal(resolveJob(input).cost, 0);
  assert.equal(jobInput.safeParse({ kind: "reference", path: "x", name: "y", copy: ["colores"] }).success, false);
});

test("la música de fondo es opcional y viaja en el trabajo", () => {
  const input = jobInput.parse({ kind: "edit", rawPath: "u1/raw/a.mp4", styleId: "tech", music: { path: "u1/assets/t.mp3", name: "t.mp3" } });
  if (input.kind !== "edit") throw new Error("tipo inesperado");
  assert.deepEqual(resolveJob(input).params.music, { path: "u1/assets/t.mp3", name: "t.mp3", volume: "baja" });
  const sin = jobInput.parse({ kind: "edit", rawPath: "u1/raw/a.mp4", styleId: "tech" });
  if (sin.kind !== "edit") throw new Error("tipo inesperado");
  assert.equal(resolveJob(sin).params.music, undefined);
});

test("los estilos premium cobran más", () => {
  const input = jobInput.parse({ kind: "edit", rawPath: "u1/raw/a.mp4", styleId: "premium-karaoke" });
  if (input.kind !== "edit") throw new Error("tipo inesperado");
  assert.equal(resolveJob(input).cost, PREMIUM_EDIT_CREDITS);
  const custom = { ...STYLES[0], id: "custom:x", engine: "hyperframes" as const };
  assert.equal(resolveJob({ ...input, styleId: "custom:x" }, custom).cost, PREMIUM_EDIT_CREDITS);
});
