import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCode, isAdmin } from "@/lib/admin";
import { handle, HttpError, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({
  credits: z.number().int().min(1).max(1000),
  maxUses: z.number().int().min(1).max(1000).default(1),
  note: z.string().max(200).default(""),
  expiresInDays: z.number().int().min(1).max(365).optional(),
  code: z
    .string()
    .regex(/^[A-Za-z0-9-]{3,40}$/, "El código solo puede tener letras, números y guiones.")
    .optional(),
});

export function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    if (!isAdmin(user.email)) throw new HttpError("No tenés permiso.", 403);
    const parsed = body.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(parsed.error.issues[0]?.message ?? "Revisá los datos.", 400);
    const input = parsed.data;

    const admin = createAdminClient();
    const expires_at = input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 86400000).toISOString() : null;
    // Si no eligieron un código, generamos uno; reintentamos por si choca con uno existente.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = (input.code ?? generateCode()).toUpperCase();
      const { data, error } = await admin
        .from("promo_codes")
        .insert({ code, credits: input.credits, max_uses: input.maxUses, note: input.note || null, expires_at })
        .select("*")
        .single();
      if (!error) return NextResponse.json({ code: data });
      if (error.code !== "23505") throw error; // 23505 = ya existe
      if (input.code) throw new HttpError("Ese código ya existe.", 409);
    }
    throw new HttpError("No se pudo generar un código. Probá de nuevo.", 500);
  });
}
