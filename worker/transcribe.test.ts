import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWhisperJson } from "./transcribe";

// Salida real de whisper.cpp con -ml 1 -sow -oj: un segmento por palabra, offsets en ms.
const json = {
  transcription: [
    { offsets: { from: 0, to: 420 }, text: " Hola" },
    { offsets: { from: 420, to: 450 }, text: "," },
    { offsets: { from: 500, to: 800 }, text: " ¿Cuánto" },
    { offsets: { from: 800, to: 1100 }, text: " sale" },
    { offsets: { from: 1100, to: 1110 }, text: "?" },
    { offsets: { from: 1200, to: 2000 }, text: " [Música]" },
    { offsets: { from: 2000, to: 2000 }, text: " eh" },
    { offsets: { from: 2100, to: 2100 }, text: " " },
  ],
};

test("convierte whisper.cpp en palabras con tiempos en segundos", () => {
  const words = parseWhisperJson(json);
  assert.deepEqual(
    words.map((w) => w.text),
    ["Hola,", "¿Cuánto", "sale?", "eh"],
  );
  assert.deepEqual(words.map((w) => w.i), [0, 1, 2, 3]);
  assert.equal(words[0].start, 0);
  assert.equal(words[0].end, 0.45);
  assert.equal(words[2].end, 1.11);
  assert.ok(words[3].end > words[3].start, "las palabras sin duración reciben un mínimo");
});
