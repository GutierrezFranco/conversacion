// Worker: toma trabajos de la cola en Supabase y los procesa.
// Corre aparte de la web (necesita ffmpeg y puede tardar minutos por trabajo).
//   npm run worker

import { fal, ApiError, ValidationError } from "@fal-ai/client";
import { env } from "../lib/env";
import { OUTPUT_RETENTION_DAYS, RAW_RETENTION_DAYS } from "../lib/storage-rules";
import { runEdit } from "./edit";
import { runImage, runVideo } from "./generate";
import { runReference } from "./reference";
import { db, type Job } from "./storage";

env("ANTHROPIC_API_KEY");
env("ELEVENLABS_API_KEY");
// fal solo hace falta si prendiste los generadores de imágenes y videos con IA.
if (process.env.FAL_KEY) fal.config({ credentials: process.env.FAL_KEY });

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 2);
const IDLE_MS = 3000;
let stopping = false;

// Mensaje que ve el usuario. Los detalles técnicos quedan en los logs.
function userMessage(err: unknown): string {
  if (err instanceof ValidationError) return "El modelo rechazó el pedido. Probá cambiando la descripción.";
  if (err instanceof ApiError) return "El servicio de IA no respondió. Probá de nuevo en un rato.";
  const msg = err instanceof Error ? err.message : "";
  // Nuestros errores pensados para el usuario terminan en punto y no traen saltos de línea.
  if (msg && msg.length < 160 && !msg.includes("\n")) return msg;
  return "Algo falló al procesar tu pedido. Te devolvimos los créditos.";
}

async function handleJob(job: Job) {
  console.log(`[${job.id}] ${job.kind} · intento ${job.attempts}`);
  try {
    let result;
    if (job.kind === "edit") {
      let parent: Job | null = null;
      if (job.parent_job_id) {
        const { data } = await db.from("jobs").select("*").eq("id", job.parent_job_id).single();
        parent = data as Job;
      }
      result = await runEdit(job, parent);
    } else if (job.kind === "reference") {
      result = await runReference(job);
    } else if (job.kind === "image") {
      result = await runImage(job);
    } else {
      result = await runVideo(job);
    }

    const { error } = await db
      .from("jobs")
      .update({ status: "done", result, error: null, locked_at: null, updated_at: new Date().toISOString() })
      .eq("id", job.id);
    if (error) throw error;
    console.log(`[${job.id}] listo`);
  } catch (err) {
    console.error(`[${job.id}] falló`, err);
    await db.rpc("fail_job", { p_job_id: job.id, p_error: userMessage(err) });
  }
}

async function loop(slot: number) {
  while (!stopping) {
    const { data, error } = await db.rpc("claim_job");
    const job = data as Job | null;
    if (error) console.error(`[slot ${slot}] no se pudo leer la cola`, error.message);
    if (!job?.id) {
      await new Promise((r) => setTimeout(r, IDLE_MS));
      continue;
    }
    await handleJob(job);
  }
}

// Trabajos que fallaron 3 veces por caídas del worker: se marcan como fallidos y se devuelven los créditos.
async function sweepStuckJobs() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data } = await db.from("jobs").select("id").eq("status", "processing").lt("locked_at", cutoff).gte("attempts", 3);
  for (const j of data ?? []) await db.rpc("fail_job", { p_job_id: j.id, p_error: "Se demoró demasiado. Te devolvimos los créditos." });
}
setInterval(() => sweepStuckJobs().catch((e) => console.error("sweep", e)), 60_000);

// Borra crudos y reels viejos para que el almacenamiento no crezca sin control.
// Los recursos de la carpeta (assets) no se tocan.
async function cleanupOldFiles() {
  const rules = [
    { bucket: "uploads", folder: "raw", days: RAW_RETENTION_DAYS },
    { bucket: "uploads", folder: "refs", days: RAW_RETENTION_DAYS },
    { bucket: "outputs", folder: "", days: OUTPUT_RETENTION_DAYS },
  ];
  for (const r of rules) {
    const { data, error } = await db.rpc("expired_objects", { p_bucket: r.bucket, p_folder: r.folder, p_days: r.days });
    if (error) throw error;
    const names = (data ?? []) as string[];
    if (names.length) {
      await db.storage.from(r.bucket).remove(names);
      console.log(`Limpieza: ${names.length} archivos viejos en ${r.bucket}/${r.folder || "*"}`);
    }
  }
}
cleanupOldFiles().catch((e) => console.error("limpieza", e));
setInterval(() => cleanupOldFiles().catch((e) => console.error("limpieza", e)), 6 * 60 * 60 * 1000);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log("Terminando los trabajos en curso…");
    stopping = true;
  });
}

console.log(`Worker de Edición Simple arrancó con ${CONCURRENCY} trabajos en paralelo.`);
await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => loop(i)));
process.exit(0);
