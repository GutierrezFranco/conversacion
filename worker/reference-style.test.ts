import { test } from "node:test";
import assert from "node:assert/strict";
import { composeStyle, type ReferenceAnalysis } from "./reference-style";
import { STYLES } from "../lib/styles";

const base = STYLES[0];
const analysis: ReferenceAnalysis = {
  name: "Amarillo palabra por palabra",
  analysis: "Subtítulos amarillos en Bebas Neue.",
  copy: { subtitulos: true, animacion: true, ritmo: false },
  captions: {
    present: true,
    font: "Kanit ExtraBold",
    size: "enorme",
    textColor: "#FFFFFF",
    highlightColor: "#FFE100",
    outline: "grueso",
    outlineColor: "#000000",
    box: false,
    boxColor: "#000000",
    uppercase: true,
    position: "centro",
    wordsPerLine: 9,
    animation: "karaoke",
  },
  pacing: { direction: "Cortes cada dos segundos.", zooms: true },
};

test("copia subtítulos y animación, pero no el ritmo si no se pidió", () => {
  const s = composeStyle(base, analysis, "custom:1");
  assert.equal(s.id, "custom:1");
  assert.equal(s.captions.font, "Kanit ExtraBold");
  assert.equal(s.captions.italic, true);
  assert.equal(s.captions.highlight, "&H0000E1FF");
  assert.equal(s.captions.animation, "karaoke");
  assert.equal(s.captions.wordsPerLine, 6); // se limita a 6
  assert.equal(s.captions.marginV, 860);
  assert.equal(s.direction, base.direction);
});

test("solo ritmo: deja los subtítulos del estilo base", () => {
  const s = composeStyle(base, { ...analysis, copy: { subtitulos: false, animacion: false, ritmo: true } }, "custom:2");
  assert.deepEqual(s.captions, base.captions);
  assert.equal(s.direction, "Cortes cada dos segundos.");
});

test("con caja usa el color de la caja y no copia nada si no hay subtítulos", () => {
  const boxed = composeStyle(base, { ...analysis, captions: { ...analysis.captions, box: true, boxColor: "#FF0000" } }, "c");
  assert.equal(boxed.captions.box, true);
  assert.equal(boxed.captions.outline, "&H000000FF");
  const none = composeStyle(base, { ...analysis, captions: { ...analysis.captions, present: false } }, "c");
  assert.deepEqual(none.captions, base.captions);
});
