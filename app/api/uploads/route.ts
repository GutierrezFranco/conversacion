import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { handle, HttpError, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({ filename: z.string().min(1).max(200) });

const ALLOWED = /\.(mp4|mov|m4v|webm|png|jpe?g|webp|gif)$/i;

// Devuelve una URL firmada para que el navegador suba el archivo directo a Storage,
// sin pasar el video por nuestro servidor.
export function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const parsed = body.safeParse(await request.json());
    if (!parsed.success || !ALLOWED.test(parsed.data.filename)) {
      throw new HttpError("Formato no soportado. Subí MP4, MOV, PNG, JPG o WEBP.", 400);
    }
    const ext = parsed.data.filename.split(".").pop()!.toLowerCase();
    const path = `${user.id}/${randomUUID()}.${ext}`;

    const { data, error } = await createAdminClient().storage.from("uploads").createSignedUploadUrl(path);
    if (error) throw error;
    return NextResponse.json({ path, token: data.token });
  });
}
