// Generador de cajitas (comentarios y preguntas) que se dibujan en un <canvas>.
// Se usa para la vista previa y para exportar el PNG transparente: lo que ves es lo que bajás.

export type StickerKind = "tiktok" | "pregunta" | "instagram";

export type StickerOptions = {
  kind: StickerKind;
  username: string;
  text: string;
  title: string; // "Respuesta a…" en TikTok, título en la cajita de preguntas
  theme: "claro" | "oscuro";
  accent: string; // #RRGGBB
  avatar?: CanvasImageSource | null;
};

export const STICKER_KINDS: { id: StickerKind; name: string; description: string; defaultTitle: string }[] = [
  { id: "tiktok", name: "Responder comentario", description: "La burbuja de «respuesta al comentario» de TikTok.", defaultTitle: "Respuesta al comentario de" },
  { id: "pregunta", name: "Cajita de preguntas", description: "La de las historias de Instagram.", defaultTitle: "Hacé tu pregunta" },
  { id: "instagram", name: "Comentario de Instagram", description: "Foto, usuario y comentario, como en los posteos.", defaultTitle: "" },
];

const WIDTH = 900;
const FONT = '"Poppins", system-ui, sans-serif';

type Colors = { bg: string; text: string; muted: string };

function colors(theme: StickerOptions["theme"]): Colors {
  return theme === "oscuro" ? { bg: "#1f1f24", text: "#ffffff", muted: "#a8a8b3" } : { bg: "#ffffff", text: "#111111", muted: "#7a7a85" };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines.filter((l, i, all) => l || (i > 0 && i < all.length - 1));
}

function drawAvatar(ctx: CanvasRenderingContext2D, o: StickerOptions, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  if (o.avatar) {
    ctx.clip();
    ctx.drawImage(o.avatar, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = o.accent;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.round(r * 1.1)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((o.username.replace(/^@/, "")[0] ?? "?").toUpperCase(), cx, cy + r * 0.05);
  }
  ctx.restore();
}

// Dibuja la cajita y devuelve el alto usado. Si ctx.canvas tiene otro tamaño, se ajusta solo.
export function drawSticker(ctx: CanvasRenderingContext2D, o: StickerOptions): { width: number; height: number } {
  const c = colors(o.theme);
  const user = o.username.trim().replace(/^@?/, "@");
  const pad = 40;

  // Primera pasada: medir para saber el alto.
  const layout = (measureOnly: boolean): number => {
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    if (o.kind === "tiktok") {
      const avatarR = 34;
      ctx.font = `500 34px ${FONT}`;
      const labelX = pad + avatarR * 2 + 22;
      ctx.font = `800 52px ${FONT}`;
      const lines = wrapText(ctx, o.text, WIDTH - pad * 2);
      const top = pad + avatarR * 2 + 26;
      const height = top + lines.length * 66 + pad - 6;
      if (measureOnly) return height + 30;

      ctx.fillStyle = c.bg;
      roundRect(ctx, 0, 0, WIDTH, height, 34);
      ctx.fill();
      // Colita de la burbuja, abajo a la izquierda.
      ctx.beginPath();
      ctx.moveTo(70, height - 2);
      ctx.lineTo(70, height + 30);
      ctx.lineTo(118, height - 2);
      ctx.closePath();
      ctx.fill();

      drawAvatar(ctx, o, pad + avatarR, pad + avatarR, avatarR);
      ctx.fillStyle = c.muted;
      ctx.font = `500 30px ${FONT}`;
      const label = `${o.title || "Respuesta al comentario de"} ${user}`;
      ctx.fillText(fit(ctx, label, WIDTH - labelX - pad), labelX, pad + avatarR + 12);

      ctx.fillStyle = c.text;
      ctx.font = `800 52px ${FONT}`;
      lines.forEach((l, i) => ctx.fillText(l, pad, top + 50 + i * 66));
      return height + 30;
    }

    if (o.kind === "pregunta") {
      const head = 150;
      ctx.font = `600 54px ${FONT}`;
      const lines = wrapText(ctx, o.text, WIDTH - pad * 2 - 20);
      const body = Math.max(170, lines.length * 70 + 90);
      const height = head + body;
      if (measureOnly) return height;

      ctx.save();
      roundRect(ctx, 0, 0, WIDTH, height, 48);
      ctx.clip();
      ctx.fillStyle = c.bg;
      ctx.fillRect(0, 0, WIDTH, height);
      const grad = ctx.createLinearGradient(0, 0, WIDTH, head);
      grad.addColorStop(0, o.accent);
      grad.addColorStop(1, shade(o.accent, -0.25));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, head);
      ctx.restore();

      ctx.fillStyle = "#ffffff";
      ctx.font = `700 46px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(fit(ctx, o.title || "Hacé tu pregunta", WIDTH - pad * 2), WIDTH / 2, head / 2 + 16);
      ctx.fillStyle = c.text;
      ctx.font = `600 54px ${FONT}`;
      const start = head + (body - lines.length * 70) / 2 + 50;
      lines.forEach((l, i) => ctx.fillText(l, WIDTH / 2, start + i * 70));
      return height;
    }

    // instagram
    const avatarR = 46;
    const textX = pad + avatarR * 2 + 26;
    const maxW = WIDTH - textX - pad - 60;
    ctx.font = `400 42px ${FONT}`;
    const lines = wrapText(ctx, o.text, maxW);
    const height = pad + 52 + lines.length * 56 + 70 + pad - 20;
    if (measureOnly) return height;

    ctx.fillStyle = c.bg;
    roundRect(ctx, 0, 0, WIDTH, height, 34);
    ctx.fill();
    drawAvatar(ctx, o, pad + avatarR, pad + avatarR, avatarR);
    ctx.fillStyle = c.text;
    ctx.font = `700 40px ${FONT}`;
    ctx.fillText(fit(ctx, user.replace(/^@/, ""), maxW), textX, pad + 40);
    ctx.font = `400 42px ${FONT}`;
    lines.forEach((l, i) => ctx.fillText(l, textX, pad + 96 + i * 56));
    ctx.fillStyle = c.muted;
    ctx.font = `600 32px ${FONT}`;
    ctx.fillText("Responder", textX, pad + 96 + lines.length * 56 + 26);
    drawHeart(ctx, WIDTH - pad - 22, pad + 60, 22, c.muted);
    return height;
  };

  const height = layout(true);
  if (ctx.canvas.width !== WIDTH || ctx.canvas.height !== height) {
    ctx.canvas.width = WIDTH;
    ctx.canvas.height = height;
  }
  ctx.clearRect(0, 0, WIDTH, height);
  layout(false);
  return { width: WIDTH, height };
}

// Recorta con "…" si no entra en el ancho.
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.4, cy, cx - s * 0.8, cy - s * 1.1, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.8, cy - s * 1.1, cx + s * 1.4, cy, cx, cy + s * 0.9);
  ctx.stroke();
  ctx.restore();
}

// Aclara (+) u oscurece (-) un color #RRGGBB.
export function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => Math.round(Math.min(255, Math.max(0, amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
  const r = ch(n >> 16);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
