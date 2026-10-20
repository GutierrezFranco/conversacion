import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FONTS } from "./fonts";
import { STYLES } from "./styles";

test("el worker instala todas las fuentes del catálogo", () => {
  const dockerfile = readFileSync(new URL("../Dockerfile.worker", import.meta.url), "utf8");
  for (const f of FONTS) assert.ok(dockerfile.includes(f.file), `falta ${f.file} en Dockerfile.worker`);
});

test("los estilos predefinidos usan fuentes del catálogo", () => {
  for (const s of STYLES) assert.ok(FONTS.some((f) => f.ass === s.captions.font), `${s.id} usa ${s.captions.font}`);
});

test("cada fuente tiene su corrección de tamaño para ffmpeg", () => {
  for (const f of FONTS) assert.ok(f.assScale >= 1 && f.assScale < 2, `${f.ass}: ${f.assScale}`);
});
