import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRenderArgs } from "./media";

const base = {
  input: "raw.mp4",
  output: "out.mp4",
  segments: [{ start: 0, end: 2, zoom: false, outStart: 0 }],
  overlays: [{ file: "logo.png", kind: "image" as const, start: 0.5, end: 1.5, layout: "top" as const }],
  assFile: "subs.ass",
};

test("sin música usa el audio original", () => {
  const args = buildRenderArgs(base);
  assert.ok(!args.includes("-stream_loop"));
  assert.equal(args[args.indexOf("-map", args.indexOf("-map") + 1) + 1], "[aout]");
});

test("con música la repite, la baja cuando hay voz y la mezcla", () => {
  const args = buildRenderArgs({ ...base, music: { file: "tema.mp3", volume: 0.12, duration: 2 } });
  const loop = args.indexOf("-stream_loop");
  assert.equal(args[loop + 3], "tema.mp3");
  const graph = args[args.indexOf("-filter_complex") + 1];
  assert.match(graph, /\[2:a\]atrim=duration=2\.000/); // entrada 2: después del video y del logo
  assert.match(graph, /sidechaincompress/);
  assert.match(graph, /afade=t=out:st=0\.500:d=1\.5/);
  assert.equal(args[args.indexOf("-map", args.indexOf("-map") + 1) + 1], "[mix]");
});
