// Avisa en qué paso va cada edición para mostrarlo en la app mientras espera.
// Se guarda en jobs.result (que está vacío hasta que termina) y se pisa con el resultado final.

import { db } from "./storage";

export type ProgressStep = "descarga" | "escucha" | "plan" | "render" | "subida";

const last = new Map<string, { step: ProgressStep; pct: number; at: number }>();

export async function reportProgress(jobId: string, step: ProgressStep, pct: number) {
  pct = Math.max(0, Math.min(99, Math.round(pct)));
  const prev = last.get(jobId);
  // Cambio de paso siempre; dentro del mismo paso, como mucho cada 3 segundos para no saturar la base.
  if (prev && prev.step === step && (pct <= prev.pct || Date.now() - prev.at < 3000)) return;
  last.set(jobId, { step, pct, at: Date.now() });
  const { error } = await db
    .from("jobs")
    .update({ result: { progress: { step, pct } }, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "processing");
  if (error) console.error(`[${jobId}] no se pudo guardar el progreso`, error.message);
}

export function forgetProgress(jobId: string) {
  last.delete(jobId);
}

// Pasa un avance de 0 a 1 dentro de un tramo de la barra (por ejemplo de 50 % a 95 %).
export function stretch(from: number, to: number, fraction: number) {
  return from + (to - from) * Math.max(0, Math.min(1, fraction));
}
