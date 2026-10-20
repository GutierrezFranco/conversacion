import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { handle, HttpError, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { ASSET_EXT, AUDIO_EXT, ASSET_MAX_BYTES, ASSET_QUOTA_BYTES, RAW_EXT, RAW_MAX_BYTES, REF_MAX_BYTES, formatBytes } from "@/lib/storage-rules";

const body = z.object({
  filename: z.string().min(1).max(200),
  size: z.number().int().nonnegative(),
  purpose: z.enum(["raw", "asset", "ref"]),
});

// Devuelve una URL firmada para que el navegador suba el archivo directo a Storage,
// sin pasar el video por nuestro servidor.
export function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const parsed = body.safeParse(await request.json());
    if (!parsed.success) throw new HttpError("Pedido inválido.", 400);
    const { filename, size, purpose } = parsed.data;
    const admin = createAdminClient();

    if (purpose === "raw") {
      if (!RAW_EXT.test(filename)) throw new HttpError("Subí el video en MP4 o MOV.", 400);
      if (size > RAW_MAX_BYTES) throw new HttpError("El video pesa más de 1 GB. Exportalo más liviano.", 400);
    } else if (purpose === "ref") {
      if (!ASSET_EXT.test(filename) || AUDIO_EXT.test(filename)) throw new HttpError("Subí la referencia como video (MP4, MOV) o captura (PNG, JPG).", 400);
      if (size > REF_MAX_BYTES) throw new HttpError(`La referencia puede pesar hasta ${formatBytes(REF_MAX_BYTES)}.`, 400);
    } else {
      if (!ASSET_EXT.test(filename)) throw new HttpError("Formato no soportado. Subí PNG, JPG, WEBP, MP4, MOV o música en MP3, M4A o WAV.", 400);
      if (size > ASSET_MAX_BYTES) throw new HttpError(`Cada recurso puede pesar hasta ${formatBytes(ASSET_MAX_BYTES)}.`, 400);
      const { data } = await admin.from("assets").select("size_bytes").eq("user_id", user.id);
      const used = (data ?? []).reduce((sum, a) => sum + Number(a.size_bytes), 0);
      if (used + size > ASSET_QUOTA_BYTES) {
        throw new HttpError(`Tu carpeta está llena (${formatBytes(used)} de ${formatBytes(ASSET_QUOTA_BYTES)}). Borrá recursos que no uses.`, 400);
      }
    }

    const ext = filename.split(".").pop()!.toLowerCase();
    const folder = { raw: "raw", asset: "assets", ref: "refs" }[purpose];
    const path = `${user.id}/${folder}/${randomUUID()}.${ext}`;

    const { data, error } = await admin.storage.from("uploads").createSignedUploadUrl(path);
    if (error) throw error;
    return NextResponse.json({ path, token: data.token });
  });
}
