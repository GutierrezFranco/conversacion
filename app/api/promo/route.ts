import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, HttpError, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({ code: z.string().min(3).max(40) });

const ERRORS: Record<string, string> = {
  PROMO_INVALID: "Ese código no existe o ya venció.",
  PROMO_EXHAUSTED: "Ese código ya se usó todas las veces posibles.",
  PROMO_USED: "Ya canjeaste este código.",
};

export function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const parsed = body.safeParse(await request.json());
    if (!parsed.success) throw new HttpError("Escribí un código válido.", 400);
    const { data, error } = await createAdminClient().rpc("redeem_promo", { p_user_id: user.id, p_code: parsed.data.code });
    if (error) {
      const known = Object.keys(ERRORS).find((k) => error.message.includes(k));
      if (known) throw new HttpError(ERRORS[known], 400);
      throw error;
    }
    return NextResponse.json({ credits: data as number });
  });
}
