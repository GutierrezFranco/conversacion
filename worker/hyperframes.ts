// Motor premium: dibuja subtítulos y plantillas con HyperFrames (HTML + GSAP renderizado con Chrome)
// en vez de ASS. ffmpeg sigue haciendo los cortes; HyperFrames solo pone la capa gráfica encima.
// Recibe los mismos datos que toAss(), así los dos motores se pueden comparar con el mismo video.

import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, join } from "node:path";
import { run } from "./media";

import { FONTS, getFont } from "../lib/fonts";
import { assToHex, type EditStyle } from "../lib/styles";
import type { TemplateInstance } from "../lib/templates";
import type { Cue } from "./timeline";

export type PlacedTemplateHtml = { instance: TemplateInstance; start: number; end: number };

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const n = (x: number) => Number(x.toFixed(3));

function templateHtml(t: TemplateInstance, id: string): string {
  const v = Object.fromEntries(Object.entries(t.values).map(([k, val]) => [k, esc(val)]));
  switch (t.templateId) {
    case "pregunta":
      return `<div id="${id}" class="tpl q"><div class="q-head">${v.titulo}</div><div class="q-body">${v.pregunta}</div></div>`;
    case "comentario": {
      const user = v.usuario.replace(/^@/, "");
      return `<div id="${id}" class="tpl c"><div class="c-top"><span class="c-av">${esc(user[0]?.toUpperCase() ?? "?")}</span><span class="c-label">${v.titulo} @${user}</span></div><div class="c-text">${v.comentario}</div><span class="c-tail"></span></div>`;
    }
    case "gancho":
      return `<div id="${id}" class="tpl hook">${v.texto}</div>`;
    case "precio":
      return `<div id="${id}" class="tpl price"><div>${v.servicio}</div><b>${v.precio}</b></div>`;
    case "etiqueta":
      return `<div id="${id}" class="tpl tag">${v.texto}</div>`;
    case "cta":
      return `<div id="${id}" class="tpl cta"><b>${v.texto}</b>${v.detalle ? `<span>${v.detalle}</span>` : ""}</div>`;
    default:
      return "";
  }
}

export function buildComposition(opts: {
  videoSrc: string; // ruta relativa al proyecto
  duration: number;
  cues: Cue[];
  style: EditStyle;
  templates: PlacedTemplateHtml[];
  gsapSrc: string;
  fontsDir: string; // carpeta (relativa al proyecto) con los .ttf del catálogo
}): string {
  const c = opts.style.captions;
  const font = getFont(c.font);
  const color = assToHex(c.primary);
  const highlight = assToHex(c.highlight);
  const outline = assToHex(c.outline);
  const bottom = c.marginV;
  const karaoke = c.animation === "karaoke";

  const cueEls: string[] = [];
  const anim: string[] = [];
  opts.cues.forEach((cue, i) => {
    const id = `cue${i}`;
    const words = cue.words
      .map((w, j) => {
        const text = esc(c.uppercase ? w.text.trim().toLocaleUpperCase("es") : w.text.trim());
        const cls = !karaoke && w.highlight ? "w hl" : "w";
        return `<span id="${id}w${j}" class="${cls}">${text}</span>`;
      })
      .join(" ");
    cueEls.push(
      `<div id="${id}" class="clip cue" data-start="${n(cue.start)}" data-duration="${n(cue.end - cue.start)}">${words}</div>`,
    );
    if (c.animation !== "none") {
      anim.push(`tl.fromTo("#${id}", { scale: 0.82, y: 18, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 0.14, ease: "back.out(2.2)" }, ${n(cue.start)});`);
    }
    if (karaoke) {
      cue.words.forEach((w, j) => {
        const end = j === cue.words.length - 1 ? cue.end : cue.words[j + 1].start;
        anim.push(`tl.to("#${id}w${j}", { color: "${highlight}", scale: 1.12, duration: 0.06 }, ${n(w.start)});`);
        anim.push(`tl.to("#${id}w${j}", { color: "${color}", scale: 1, duration: 0.06 }, ${n(Math.max(w.start + 0.06, end - 0.03))});`);
      });
    }
  });

  const tplEls: string[] = [];
  opts.templates.forEach((p, i) => {
    const id = `tpl${i}`;
    tplEls.push(templateHtml(p.instance, id).replace(/^<div id="([^"]+)" class="tpl/, `<div id="$1" data-start="${n(p.start)}" data-duration="${n(p.end - p.start)}" class="clip tpl`));
    anim.push(`tl.fromTo("#${id}", { y: -60, scale: 0.9, opacity: 0, rotation: -3 }, { y: 0, scale: 1, opacity: 1, rotation: 0, duration: 0.45, ease: "elastic.out(1, 0.6)" }, ${n(p.start)});`);
    anim.push(`tl.to("#${id}", { y: -30, opacity: 0, duration: 0.18, ease: "power2.in" }, ${n(Math.max(p.start + 0.5, p.end - 0.18))});`);
  });

  const stroke = !c.box && c.outlineWidth > 0 ? `-webkit-text-stroke: ${c.outlineWidth * 1.6}px ${outline}; paint-order: stroke fill;` : "";
  const box = c.box ? `background: ${outline}; padding: 6px 22px; border-radius: 14px; box-decoration-break: clone; -webkit-box-decoration-break: clone;` : "";

  return `<!doctype html>
<html lang="es" data-resolution="portrait">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="${opts.gsapSrc}"></script>
<style>
${FONTS.map(
  (f) =>
    `@font-face { font-family: "${f.css.family}"; font-weight: ${f.css.weight}; font-style: ${f.css.italic ? "italic" : "normal"}; src: url("${opts.fontsDir}/${f.file.split("/").pop()}"); }`,
).join("\n")}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1920px; overflow: hidden; background: #000; }
#root { position: relative; width: 1080px; height: 1920px; }
.clip { position: absolute; inset: 0; }
video.clip { width: 1080px; height: 1920px; object-fit: cover; }
.cue { inset: auto 70px ${bottom}px 70px; text-align: center; transform-origin: 50% 100%;
  font-family: "${font?.css.family ?? "Poppins"}", sans-serif; font-weight: ${font?.css.weight ?? 700}; font-style: ${font?.css.italic ? "italic" : "normal"};
  font-size: ${Math.round(c.size * 1.08)}px; line-height: 1.12; color: ${color}; ${stroke} ${box}
  text-shadow: ${c.glow ? `0 0 18px ${c.glow}, 0 0 42px ${c.glow}` : "0 6px 18px rgba(0,0,0,.35)"}; }
.w { display: inline-block; margin: 0 0.06em; }
.hl { color: ${highlight}; }
.tpl { opacity: 0; inset: auto 0 auto 0; margin: 0 auto; width: fit-content; font-family: "Poppins", sans-serif; text-align: center; box-shadow: 0 18px 50px rgba(0,0,0,.35); }
.q { top: 300px; width: 860px; border-radius: 48px; overflow: hidden; background: #fff; }
.q-head { background: linear-gradient(135deg, #FF8A3D, #FF5A1A); color: #fff; font-weight: 800; font-size: 46px; padding: 34px 20px; text-transform: uppercase; letter-spacing: .02em; }
.q-body { color: #0f1118; font-weight: 700; font-size: 60px; line-height: 1.2; padding: 40px 50px 48px; }
.c { top: 300px; width: 880px; background: #fff; border-radius: 34px; padding: 36px 40px 40px; text-align: left; }
.c-top { display: flex; align-items: center; gap: 20px; margin-bottom: 18px; }
.c-av { width: 68px; height: 68px; border-radius: 50%; background: #FF6A1A; color: #fff; font-weight: 800; font-size: 36px; display: grid; place-items: center; flex-shrink: 0; }
.c-label { color: #7a7a85; font-weight: 500; font-size: 32px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.c-text { color: #111; font-weight: 800; font-size: 56px; line-height: 1.15; }
.c-tail { position: absolute; left: 70px; bottom: -28px; width: 0; height: 0; border-left: 0 solid transparent; border-right: 48px solid transparent; border-top: 30px solid #fff; }
.hook { top: 250px; max-width: 960px; background: #FF6A1A; color: #0f1118; font-weight: 800; font-size: 86px; line-height: 1.1; padding: 26px 46px; border-radius: 28px; text-transform: uppercase; }
.price { top: 360px; background: #1a1e26; color: #fff; padding: 36px 60px; border-radius: 36px; font-weight: 600; font-size: 52px; }
.price b { display: block; color: #FF6A1A; font-weight: 800; font-size: 122px; line-height: 1.1; }
.tag { top: 300px; background: #FF6A1A; color: #0f1118; font-weight: 800; font-size: 74px; padding: 14px 56px; border-radius: 999px; text-transform: uppercase; }
.cta { top: 520px; background: #fff; color: #0f1118; padding: 40px 60px; border-radius: 40px; }
.cta b { display: block; font-weight: 800; font-size: 74px; line-height: 1.15; }
.cta span { display: block; color: #FF6A1A; font-weight: 700; font-size: 48px; margin-top: 10px; }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${n(opts.duration)}" data-width="1080" data-height="1920">
<video id="footage" class="clip" src="${opts.videoSrc}" data-start="0" data-duration="${n(opts.duration)}" data-has-audio="true"></video>
${tplEls.join("\n")}
${cueEls.join("\n")}
</div>
<script>
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
${anim.join("\n")}
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>
`;
}

// Arma el proyecto de HyperFrames en una carpeta y renderiza el MP4 final.
// `video` es el video ya cortado por ffmpeg (con recursos y música, sin subtítulos).
export async function renderWithHyperframes(opts: {
  dir: string;
  video: string;
  output: string;
  duration: number;
  cues: Cue[];
  style: EditStyle;
  templates: PlacedTemplateHtml[];
  fontsDir?: string; // donde están instaladas las .ttf (FONTS_DIR)
}) {
  const project = join(opts.dir, "hf");
  await mkdir(join(project, "fonts"), { recursive: true });
  const require = createRequire(import.meta.url);
  await copyFile(require.resolve("gsap/dist/gsap.min.js"), join(project, "gsap.min.js"));
  await copyFile(opts.video, join(project, "base.mp4"));
  if (opts.fontsDir) {
    for (const f of FONTS) {
      const file = basename(f.file);
      await copyFile(join(opts.fontsDir, file), join(project, "fonts", file)).catch(() => null);
    }
  }
  await writeFile(
    join(project, "index.html"),
    buildComposition({ videoSrc: "base.mp4", duration: opts.duration, cues: opts.cues, style: opts.style, templates: opts.templates, gsapSrc: "gsap.min.js", fontsDir: "fonts" }),
  );
  const bin = join(process.cwd(), "node_modules", ".bin", "hyperframes");
  // Modo de poca memoria: un solo Chrome. En servidores chicos (1 GB) el modo automático se queda sin RAM.
  await run(bin, [
    "render", project, "-o", opts.output, "--quality", "standard", "--fps", "30", "--quiet",
    "--workers", "1", "--low-memory-mode", "--frames-cache-dir", "off",
  ]);
}
