// Dibuja las plantillas como eventos ASS (formas vectoriales + texto), en la misma pasada
// que los subtítulos. No necesita imágenes ni servicios externos.

import { getTemplate, type TemplateInstance } from "../lib/templates";

const W = 1080;

// Colores ASS (&HBBGGRR&)
const ACCENT = "&H1A6AFF&"; // #FF6A1A
const WHITE = "&HFFFFFF&";
const DARK = "&H18110F&"; // #0F1118
const CARD = "&H261E1A&"; // #1A1E26
const GRAY = "&H857A7A&"; // #7A7A85

// Ancho promedio de un carácter en Poppins, relativo al tamaño de letra en ASS
// (medido renderizando; con un poco de margen para palabras con letras anchas).
const CHAR_W = 0.42;
const CHAR_W_UPPER = 0.48;

export function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && (line + " " + word).length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function textWidth(text: string, size: number, upper: boolean): number {
  return text.length * size * (upper ? CHAR_W_UPPER : CHAR_W);
}

function roundedRect(w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2);
  const k = rr * 0.448; // distancia de los puntos de control para que la curva sea un cuarto de círculo
  const p = (n: number) => Math.round(n);
  return [
    `m ${p(rr)} 0`,
    `l ${p(w - rr)} 0 b ${p(w - k)} 0 ${p(w)} ${p(k)} ${p(w)} ${p(rr)}`,
    `l ${p(w)} ${p(h - rr)} b ${p(w)} ${p(h - k)} ${p(w - k)} ${p(h)} ${p(w - rr)} ${p(h)}`,
    `l ${p(rr)} ${p(h)} b ${p(k)} ${p(h)} 0 ${p(h - k)} 0 ${p(h - rr)}`,
    `l 0 ${p(rr)} b 0 ${p(k)} ${p(k)} 0 ${p(rr)} 0`,
  ].join(" ");
}

function clean(text: string): string {
  return text.replace(/[{}\\]/g, "").replace(/\n/g, " ");
}

export type Ctx = { start: string; end: string };

const FADE = "\\fad(140,140)";

function shape(ctx: Ctx, layer: number, x: number, y: number, color: string, path: string): string {
  return `Dialogue: ${layer},${ctx.start},${ctx.end},Tpl,,0,0,0,,{\\an7\\pos(${Math.round(x)},${Math.round(y)})\\p1\\bord0\\shad0\\1c${color}${FADE}}${path}{\\p0}`;
}

function label(ctx: Ctx, layer: number, x: number, y: number, size: number, color: string, text: string, font = "Poppins Bold"): string {
  return `Dialogue: ${layer},${ctx.start},${ctx.end},Tpl,,0,0,0,,{\\an5\\pos(${Math.round(x)},${Math.round(y)})\\fn${font}\\fs${size}\\bord0\\shad0\\1c${color}${FADE}}${clean(text)}`;
}

// Texto alineado a la izquierda, centrado verticalmente en y.
function leftLabel(ctx: Ctx, layer: number, x: number, y: number, size: number, color: string, text: string, font = "Poppins Bold"): string {
  return `Dialogue: ${layer},${ctx.start},${ctx.end},Tpl,,0,0,0,,{\\an4\\pos(${Math.round(x)},${Math.round(y)})\\fn${font}\\fs${size}\\bord0\\shad0\\1c${color}${FADE}}${clean(text)}`;
}

function centeredBox(width: number): number {
  return (W - width) / 2;
}

export function templateEvents(t: TemplateInstance, ctx: Ctx): string[] {
  const v = t.values;
  switch (t.templateId) {
    case "pregunta": {
      const width = 840;
      const x = centeredBox(width);
      const y = 300;
      const header = 118;
      const lines = wrap(v.pregunta, 24);
      const lineH = 80;
      const body = lines.length * lineH + 70;
      const out = [
        shape(ctx, 10, x, y, WHITE, roundedRect(width, header + body, 44)),
        shape(ctx, 11, x, y, ACCENT, roundedRect(width, header, 44)),
        shape(ctx, 11, x, y + header / 2, ACCENT, roundedRect(width, header / 2, 0)),
        label(ctx, 12, W / 2, y + header / 2, 50, WHITE, v.titulo.toLocaleUpperCase("es"), "Poppins ExtraBold"),
      ];
      lines.forEach((line, i) => out.push(label(ctx, 12, W / 2, y + header + 35 + lineH * (i + 0.5), 64, DARK, line)));
      return out;
    }
    case "comentario": {
      const width = 880;
      const x = centeredBox(width);
      const y = 300;
      const pad = 40;
      const r = 34;
      const lines = wrap(v.comentario, 26);
      const lineH = 60;
      const top = pad + r * 2 + 24;
      const height = top + lines.length * lineH + pad - 10;
      const user = `@${v.usuario.replace(/^@/, "")}`;
      const initial = (v.usuario.replace(/^@/, "")[0] ?? "?").toUpperCase();
      const out = [
        shape(ctx, 10, x, y, WHITE, roundedRect(width, height, 34)),
        // colita de la burbuja
        shape(ctx, 10, x + 70, y + height - 2, WHITE, "m 0 0 l 0 30 l 48 0"),
        shape(ctx, 11, x + pad, y + pad, ACCENT, roundedRect(r * 2, r * 2, r)),
        label(ctx, 12, x + pad + r, y + pad + r, 40, WHITE, initial, "Poppins ExtraBold"),
        leftLabel(ctx, 12, x + pad + r * 2 + 22, y + pad + r, 34, GRAY, `${v.titulo} ${user}`, "Poppins Medium"),
      ];
      lines.forEach((line, i) => out.push(leftLabel(ctx, 12, x + pad, y + top + lineH * (i + 0.5), 54, DARK, line, "Poppins ExtraBold")));
      return out;
    }
    case "gancho": {
      const text = v.texto.toLocaleUpperCase("es");
      const lines = wrap(text, 18);
      const size = 88;
      const lineH = 104;
      const width = Math.min(980, Math.max(...lines.map((l) => textWidth(l, size, true))) + 90);
      const height = lines.length * lineH + 50;
      const x = centeredBox(width);
      const y = 250;
      const out = [shape(ctx, 10, x, y, ACCENT, roundedRect(width, height, 28))];
      lines.forEach((line, i) => out.push(label(ctx, 11, W / 2, y + 25 + lineH * (i + 0.5), size, DARK, line, "Poppins ExtraBold")));
      return out;
    }
    case "precio": {
      const width = Math.min(900, Math.max(textWidth(v.servicio, 52, false), textWidth(v.precio, 118, false)) + 120);
      const height = 250;
      const x = centeredBox(width);
      const y = 360;
      return [
        shape(ctx, 10, x, y, CARD, roundedRect(width, height, 36)),
        label(ctx, 12, W / 2, y + 70, 52, WHITE, v.servicio),
        label(ctx, 12, W / 2, y + 168, 118, ACCENT, v.precio, "Poppins ExtraBold"),
      ];
    }
    case "etiqueta": {
      const text = v.texto.toLocaleUpperCase("es");
      const size = 72;
      const width = textWidth(text, size, true) + 110;
      const height = 112;
      const x = centeredBox(width);
      const y = 300;
      return [shape(ctx, 10, x, y, ACCENT, roundedRect(width, height, height / 2)), label(ctx, 11, W / 2, y + height / 2, size, DARK, text, "Poppins ExtraBold")];
    }
    case "cta": {
      const size = 74;
      const lines = wrap(v.texto, 22);
      const lineH = 90;
      const extra = v.detalle ? 70 : 0;
      const width = Math.min(960, Math.max(...lines.map((l) => textWidth(l, size, false)), v.detalle ? textWidth(v.detalle, 48, false) : 0) + 120);
      const height = lines.length * lineH + extra + 70;
      const x = centeredBox(width);
      const y = 520;
      const out = [shape(ctx, 10, x, y, WHITE, roundedRect(width, height, 40))];
      lines.forEach((line, i) => out.push(label(ctx, 12, W / 2, y + 35 + lineH * (i + 0.5), size, DARK, line, "Poppins ExtraBold")));
      if (v.detalle) out.push(label(ctx, 12, W / 2, y + 35 + lineH * lines.length + 30, 48, ACCENT, v.detalle));
      return out;
    }
    default:
      return [];
  }
}

export type TemplatePlacement = { template: number; fromWord: number; toWord: number };
export type PlacedTemplate = { instance: TemplateInstance; start: number; end: number };

// Ubica cada plantilla en el tiempo del video editado. Si Claude no la ubicó (o la ancló a
// palabras cortadas), usa la posición por defecto: así nunca se pierde una plantilla pedida.
export function placeTemplates(
  instances: TemplateInstance[],
  placements: TemplatePlacement[],
  mapRange: (from: number, to: number) => { start: number; end: number } | null,
  duration: number,
): PlacedTemplate[] {
  return instances.map((instance, index) => {
    const t = getTemplate(instance.templateId);
    const seconds = Math.min(t?.defaultSeconds ?? 3, duration);
    const p = placements.find((x) => x.template === index);
    const range = p ? mapRange(p.fromWord, p.toWord) : null;

    let start: number;
    let end: number;
    if (range) {
      start = range.start;
      end = Math.max(range.end, start + Math.min(2, seconds));
    } else if (t?.placement === "end") {
      start = duration - seconds;
      end = duration;
    } else {
      start = 0;
      end = seconds;
    }
    start = Math.max(0, Math.min(start, duration - 0.5));
    end = Math.min(Math.max(end, start + 0.5), duration);
    return { instance, start, end };
  });
}
