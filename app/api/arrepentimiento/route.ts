import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, HttpError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({
  email: z.string().email("Escribí un mail válido."),
  purchaseInfo: z.string().max(300).default(""),
  details: z.string().max(1000).default(""),
});

// No pide iniciar sesión: la ley exige que arrepentirse sea tan simple como comprar.
export function POST(request: Request) {
  return handle(async () => {
    const parsed = body.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(parsed.error.issues[0]?.message ?? "Revisá los datos.", 400);
    const { data, error } = await createAdminClient()
      .from("withdrawal_requests")
      .insert({ email: parsed.data.email, purchase_info: parsed.data.purchaseInfo || null, details: parsed.data.details || null })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ code: `ARR-${String(data.id).padStart(5, "0")}` });
  });
}
