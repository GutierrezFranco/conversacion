import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, HttpError, requireUser } from "@/lib/api";
import { env, appUrl } from "@/lib/env";
import { createPreference } from "@/lib/mercadopago";
import { getPack, packPriceArs } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({ packId: z.string() });

export function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const parsed = body.safeParse(await request.json());
    const pack = parsed.success ? getPack(parsed.data.packId) : undefined;
    if (!pack) throw new HttpError("Ese paquete no existe.", 400);

    const amountArs = packPriceArs(pack, Number(env("ARS_PER_USD")));
    const admin = createAdminClient();

    const { data: purchase, error } = await admin
      .from("purchases")
      .insert({ user_id: user.id, pack_id: pack.id, credits: pack.credits, amount_ars: amountArs })
      .select("id")
      .single();
    if (error) throw error;

    const preference = await createPreference({
      purchaseId: purchase.id,
      title: `Edición Simple · ${pack.credits} créditos (${pack.name})`,
      amountArs,
      payerEmail: user.email,
      appUrl: appUrl(),
      accessToken: env("MP_ACCESS_TOKEN"),
    });

    await admin.from("purchases").update({ mp_preference_id: preference.id }).eq("id", purchase.id);

    return NextResponse.json({ url: preference.initPoint });
  });
}
