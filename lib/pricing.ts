// Todo lo que define cuánto cobrás vive acá. Cambiá estos números sin tocar el resto del código.
//
// Precio pensado para técnicos: $5.000 por video editado y $2.500 por cada ronda de cambios
// (o sea, hasta $7.500 con una iteración). Por dentro se maneja con créditos:
//   1 crédito = $500 · una edición = 10 créditos · pedir cambios = 5 créditos

export const CREDIT_PRICE_ARS = 500;
export const EDIT_CREDITS = 10;
export const ITERATION_CREDITS = 5;
export const SIGNUP_BONUS_CREDITS = 10; // una edición gratis para probar

// Costo real estimado (Claude + transcripción + render). Con el dólar a $1.450 una edición te
// cuesta unos $600 y la cobrás $5.000. Revisalo con tus facturas del primer mes.
export const EDIT_COST_USD = 0.4;
export const ITERATION_COST_USD = 0.15;

// ---------- Paquetes ----------

export type Pack = { id: string; name: string; credits: number; priceArs: number; highlight?: boolean };

export const PACKS: Pack[] = [
  { id: "uno", name: "1 video", credits: 10, priceArs: 5000 },
  { id: "cinco", name: "5 videos", credits: 50, priceArs: 22500, highlight: true },
  { id: "diez", name: "10 videos", credits: 100, priceArs: 40000 },
];

export function getPack(id: string): Pack | undefined {
  return PACKS.find((p) => p.id === id);
}

export function videosIn(pack: Pack): number {
  return Math.floor(pack.credits / EDIT_CREDITS);
}

export function pricePerVideo(pack: Pack): number {
  return Math.round(pack.priceArs / videosIn(pack));
}

export function formatArs(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}

// ---------- Generadores con IA (opcionales) ----------
// Se cobran según lo que cuestan en fal, con este margen.
export const MARGIN = 3;

export function creditsFor(costUsd: number, arsPerUsd: number): number {
  // El redondeo previo evita que errores de coma flotante (6.0000001) sumen un crédito de más.
  const raw = Math.round(((costUsd * arsPerUsd * MARGIN) / CREDIT_PRICE_ARS) * 1e6) / 1e6;
  return Math.max(1, Math.ceil(raw));
}

export function arsPerUsd(): number {
  return Number(process.env.ARS_PER_USD ?? 1450);
}

// ---------- Modelos de imagen y video (fal.ai) ----------
// Precios de fal consultados en octubre 2026. Verificalos en fal.ai/pricing antes de lanzar:
// cambian seguido y algunos dependen de la resolución.

export type ImageModel = {
  id: string;
  endpoint: string;
  name: string;
  description: string;
  costPerImageUsd: number;
};

export const IMAGE_MODELS: ImageModel[] = [
  {
    id: "nano-banana",
    endpoint: "google/nano-banana-2.1",
    name: "Nano Banana 2.1",
    description: "De Google. Ideal para textos, productos y personas consistentes.",
    costPerImageUsd: 0.08,
  },
  {
    id: "seedream",
    endpoint: "bytedance/seedream/v5/pro/text-to-image",
    name: "Seedream 5.0 Pro",
    description: "Fotos muy detalladas y diseños con mucho texto.",
    costPerImageUsd: 0.0675,
  },
];

export type VideoModel = {
  id: string;
  endpoint: string;
  name: string;
  description: string;
  costPerSecondUsd: number;
  durations: number[];
};

export const VIDEO_MODELS: VideoModel[] = [
  {
    id: "h3-turbo",
    endpoint: "minimax/h3-max-turbo/text-to-video",
    name: "MiniMax H3 Turbo",
    description: "El más barato. Muy bueno para b-roll y pruebas.",
    costPerSecondUsd: 0.01625,
    durations: [5, 8, 10],
  },
  {
    id: "seedance",
    endpoint: "bytedance/seedance-2.5/us/text-to-video",
    name: "Seedance 2.5",
    description: "Cinematográfico, con audio sincronizado.",
    // fal lo cobra por tokens; esto es una estimación a 720p.
    costPerSecondUsd: 0.12,
    durations: [5, 8, 10],
  },
  {
    id: "kling",
    endpoint: "fal-ai/kling-video/v3/standard/text-to-video",
    name: "Kling 3.0",
    description: "Movimiento muy natural y audio nativo.",
    costPerSecondUsd: 0.14,
    durations: [5, 8, 10],
  },
];

export function imageCredits(model: ImageModel, count: number, rate = arsPerUsd()): number {
  return creditsFor(model.costPerImageUsd * count, rate);
}

export function videoCredits(model: VideoModel, seconds: number, rate = arsPerUsd()): number {
  return creditsFor(model.costPerSecondUsd * seconds, rate);
}
