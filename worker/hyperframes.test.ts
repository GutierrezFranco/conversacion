import { test } from "node:test";
import assert from "node:assert/strict";
import { buildComposition } from "./hyperframes";
import { STYLES } from "../lib/styles";
import { normalizeInstance } from "../lib/templates";

test("arma una composición válida y escapa el texto del usuario", () => {
  const html = buildComposition({
    videoSrc: "base.mp4",
    duration: 5,
    cues: [{ start: 0.2, end: 1.2, words: [{ text: "<b>hola</b>", highlight: true, start: 0.2, end: 0.6 }] }],
    style: STYLES[0],
    templates: [{ instance: normalizeInstance({ templateId: "etiqueta", values: { texto: "Antes" }, note: "" }), start: 0, end: 2 }],
    gsapSrc: "gsap.min.js",
    fontsDir: "fonts",
  });
  assert.match(html, /data-composition-id="main"/);
  assert.match(html, /<video id="footage"/);
  assert.ok(!html.includes("<b>hola</b>"));
  assert.ok(html.includes("&lt;B&gt;HOLA&lt;/B&gt;"));
  assert.match(html, /id="tpl0" data-start="0" data-duration="2" class="clip tpl tag"/);
  assert.match(html, /window\.__timelines\["main"\] = tl;/);
});
