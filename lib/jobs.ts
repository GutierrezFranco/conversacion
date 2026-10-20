import { z } from "zod";
import { getStyle } from "./styles";
import {
  EDIT_CREDITS,
  ITERATION_CREDITS,
  IMAGE_MODELS,
  VIDEO_MODELS,
  imageCredits,
  videoCredits,
} from "./pricing";

// Lo que el navegador manda para crear cada tipo de trabajo. El precio siempre se calcula
// acá en el servidor: nunca confiamos en un precio que venga del cliente.

const resourceSchema = z.object({
  path: z.string().min(1),
  name: z.string().max(200),
  kind: z.enum(["image", "video"]),
  note: z.string().max(500).default(""),
});

export const editInput = z.object({
  kind: z.literal("edit"),
  title: z.string().max(120).default("Mi reel"),
  rawPath: z.string().min(1),
  styleId: z.string(),
  resources: z.array(resourceSchema).max(10).default([]),
  instructions: z.string().max(2000).default(""),
});

export const iterateInput = z.object({
  kind: z.literal("iterate"),
  parentJobId: z.string().uuid(),
  changes: z.string().min(3).max(2000),
});

export const imageInput = z.object({
  kind: z.literal("image"),
  modelId: z.string(),
  prompt: z.string().min(3).max(4000),
  aspectRatio: z.enum(["9:16", "1:1", "16:9", "4:5"]).default("9:16"),
  count: z.number().int().min(1).max(4).default(1),
});

export const videoInput = z.object({
  kind: z.literal("video"),
  modelId: z.string(),
  prompt: z.string().min(3).max(2500),
  aspectRatio: z.enum(["9:16", "1:1", "16:9"]).default("9:16"),
  seconds: z.number().int().min(3).max(15).default(5),
});

export const jobInput = z.discriminatedUnion("kind", [editInput, iterateInput, imageInput, videoInput]);
export type JobInput = z.infer<typeof jobInput>;

export type ResolvedJob = {
  kind: "edit" | "image" | "video";
  title: string;
  params: Record<string, unknown>;
  cost: number;
  parentJobId?: string;
};

// Valida contra el catálogo y devuelve el trabajo listo para cobrar. Lanza Error con un mensaje
// para mostrarle al usuario si algo no cierra.
export function resolveJob(input: Exclude<JobInput, { kind: "iterate" }>): ResolvedJob {
  switch (input.kind) {
    case "edit": {
      const style = getStyle(input.styleId);
      if (!style) throw new Error("Ese estilo no existe.");
      return {
        kind: "edit",
        title: input.title,
        params: { rawPath: input.rawPath, styleId: style.id, resources: input.resources, instructions: input.instructions },
        cost: EDIT_CREDITS,
      };
    }
    case "image": {
      const model = IMAGE_MODELS.find((m) => m.id === input.modelId);
      if (!model) throw new Error("Ese modelo de imagen no existe.");
      return {
        kind: "image",
        title: input.prompt.slice(0, 80),
        params: { modelId: model.id, endpoint: model.endpoint, prompt: input.prompt, aspectRatio: input.aspectRatio, count: input.count },
        cost: imageCredits(model, input.count),
      };
    }
    case "video": {
      const model = VIDEO_MODELS.find((m) => m.id === input.modelId);
      if (!model) throw new Error("Ese modelo de video no existe.");
      if (!model.durations.includes(input.seconds)) throw new Error("Esa duración no está disponible para este modelo.");
      return {
        kind: "video",
        title: input.prompt.slice(0, 80),
        params: { modelId: model.id, endpoint: model.endpoint, prompt: input.prompt, aspectRatio: input.aspectRatio, seconds: input.seconds },
        cost: videoCredits(model, input.seconds),
      };
    }
  }
}

export function iterationJob(parent: { id: string; title: string | null; params: Record<string, unknown> }, changes: string): ResolvedJob {
  return {
    kind: "edit",
    title: `${parent.title ?? "Reel"} (cambios)`,
    params: { ...parent.params, changes },
    cost: ITERATION_CREDITS,
    parentJobId: parent.id,
  };
}

// Un usuario solo puede referenciar archivos dentro de su propia carpeta.
export function ownsPath(userId: string, path: string): boolean {
  return path.startsWith(`${userId}/`) && !path.includes("..");
}
