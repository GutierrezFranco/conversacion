import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, HttpError, requireUser, signPaths } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ASSET_MAX_BYTES, ASSET_QUOTA_BYTES, assetKind } from "@/lib/storage-rules";

export function GET() {
  return handle(async () => {
    await requireUser();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("assets")
      .select("id, path, name, kind, size_bytes, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const signed = await signPaths("uploads", data.map((a) => a.path));
    const used = data.reduce((sum, a) => sum + Number(a.size_bytes), 0);
    return NextResponse.json({
      assets: data.map((a) => ({ ...a, url: signed[a.path] ?? null })),
      usedBytes: used,
      quotaBytes: ASSET_QUOTA_BYTES,
    });
  });
}

const body = z.object({ path: z.string().min(1), name: z.string().min(1).max(200) });

// Se llama cuando el navegador terminó de subir un recurso: lo guarda en la carpeta.
export function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const parsed = body.safeParse(await request.json());
    if (!parsed.success) throw new HttpError("Pedido inválido.", 400);
    const { path, name } = parsed.data;
    if (!path.startsWith(`${user.id}/assets/`) || path.includes("..")) throw new HttpError("Archivo inválido.", 403);

    const admin = createAdminClient();
    // El tamaño lo leemos de Storage: no confiamos en el que manda el navegador.
    const { data: info, error: infoError } = await admin.storage.from("uploads").info(path);
    if (infoError || !info) throw new HttpError("No encontramos el archivo subido.", 404);
    const size = info.size ?? 0;
    if (size > ASSET_MAX_BYTES) {
      await admin.storage.from("uploads").remove([path]);
      throw new HttpError("El archivo es demasiado pesado.", 400);
    }

    const { data, error } = await admin
      .from("assets")
      .upsert({ user_id: user.id, path, name, kind: assetKind(name), size_bytes: size }, { onConflict: "path" })
      .select("id, path, name, kind, size_bytes, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ asset: data });
  });
}
