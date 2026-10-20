// Todo lo que define cuánto cobrás vive acá. Cambiá estos números sin tocar el resto del código.
//
// Cómo se calcula el precio de cada acción:
//   créditos = ceil(costo real en USD × MARGEN / VALOR_BASE_DEL_CRÉDITO)
// Con MARGEN 3 y crédito a US$0,05, una acción que te cuesta US$0,10 se cobra 6 créditos (US$0,30).
// El margen tiene que cubrir la comisión de Mercado Pago, impuestos y los trabajos que fallan.

export const CREDIT_BASE_USD = 0.05;
export const MARGIN = 3;
export const SIGNUP_BONUS_CREDITS = 30; // alcanza para una edición de prueba

export function creditsFor(costUsd: number): number {
  // El redondeo previo evita que errores de coma flotante (6.0000001) sumen un crédito de más.
  const raw = Math.round(((costUsd * MARGIN) / CREDIT_BASE_USD) * 1e6) / 1e6;
  return Math.max(1, Math.ceil(raw));
}

// ---------- Paquetes de créditos ----------

export type Pack = { id: string; name: string; credits: number; priceUsd: number; highlight?: boolean };

export const PACKS: Pack[] = [
  { id: "starter", name: "Starter", credits: 200, priceUsd: 10 },
  { id: "creator", name: "Creator", credits: 600, priceUsd: 27, highlight: true },
  { id: "pro", name: "Pro", credits: 1500, priceUsd: 60 },
];

export function getPack(id: string): Pack | undefined {
  return PACKS.find((p) => p.id === id);
}

export function packPriceArs(pack: Pack, arsPerUsd: number): number {
  // Redondeo a $100 para que el precio se vea prolijo.
  return Math.ceil((pack.priceUsd * arsPerUsd) / 100) * 100;
}

// ---------- Edición de reels ----------

// Costo estimado de una edición: Claude (plan de edición) + transcripción + render.
// Revisalo con tus facturas reales del primer mes.
export const EDIT_COST_USD = 0.4;
// Pedir cambios sobre una edición ya hecha reusa la transcripción, así que cuesta menos.
export const ITERATION_COST_USD = 0.15;

export const EDIT_CREDITS = creditsFor(EDIT_COST_USD);
export const ITERATION_CREDITS = creditsFor(ITERATION_COST_USD);

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

export function imageCredits(model: ImageModel, count: number): number {
  return creditsFor(model.costPerImageUsd * count);
}

export function videoCredits(model: VideoModel, seconds: number): number {
  return creditsFor(model.costPerSecondUsd * seconds);
}
