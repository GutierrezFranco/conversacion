import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getPayment, verifyWebhookSignature } from "@/lib/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";

// Mercado Pago avisa acá cada vez que cambia un pago. Nunca acreditamos créditos por la
// redirección del navegador (se puede falsificar): solo cuando este webhook está firmado y
// la API de Mercado Pago confirma que el pago está aprobado y por el monto correcto.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as { type?: string; data?: { id?: string | number } };

  const type = body.type ?? url.searchParams.get("type");
  const dataId = String(body.data?.id ?? url.searchParams.get("data.id") ?? "");
  if (type !== "payment" || !dataId) {
    return NextResponse.json({ ignored: true });
  }

  const valid = verifyWebhookSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
    secret: env("MP_WEBHOOK_SECRET"),
  });
  if (!valid) {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  const payment = await getPayment(dataId, env("MP_ACCESS_TOKEN"));
  const purchaseId = payment.external_reference;
  if (!purchaseId) return NextResponse.json({ ignored: true });

  const admin = createAdminClient();
  const { data: purchase } = await admin.from("purchases").select("*").eq("id", purchaseId).maybeSingle();
  if (!purchase) return NextResponse.json({ ignored: true });

  if (payment.status === "approved") {
    const paidEnough = payment.currency_id === "ARS" && payment.transaction_amount >= Number(purchase.amount_ars);
    if (!paidEnough) {
      console.error("Pago aprobado con monto distinto al de la compra", { purchaseId, payment: payment.id });
      return NextResponse.json({ error: "monto no coincide" }, { status: 200 });
    }
    const { error } = await admin.rpc("approve_purchase", { p_purchase_id: purchaseId, p_payment_id: String(payment.id) });
    // Si falla, devolvemos 500 para que Mercado Pago reintente.
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "no se pudo acreditar" }, { status: 500 });
    }
  } else if (payment.status === "rejected" || payment.status === "cancelled") {
    await admin.from("purchases").update({ status: "rejected" }).eq("id", purchaseId).eq("status", "pending");
  }

  return NextResponse.json({ ok: true });
}
