import { createHmac, timingSafeEqual } from "node:crypto";

// Integración con Mercado Pago Checkout Pro usando la API REST directamente.
// Docs: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro

const API = "https://api.mercadopago.com";

type PreferenceInput = {
  purchaseId: string;
  title: string;
  amountArs: number;
  payerEmail?: string;
  appUrl: string;
  accessToken: string;
};

export async function createPreference(input: PreferenceInput): Promise<{ id: string; initPoint: string }> {
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      // Si el request se reintenta, Mercado Pago no crea una preferencia duplicada.
      "X-Idempotency-Key": input.purchaseId,
    },
    body: JSON.stringify({
      items: [
        {
          id: input.purchaseId,
          title: input.title,
          description: "Créditos para editar reels en Edición Simple",
          picture_url: `${input.appUrl}/icon-512.png`,
          category_id: "services",
          quantity: 1,
          currency_id: "ARS",
          unit_price: input.amountArs,
        },
      ],
      payer: input.payerEmail ? { email: input.payerEmail } : undefined,
      external_reference: input.purchaseId,
      notification_url: `${input.appUrl}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${input.appUrl}/app/creditos?estado=aprobado`,
        pending: `${input.appUrl}/app/creditos?estado=pendiente`,
        failure: `${input.appUrl}/app/creditos?estado=rechazado`,
      },
      auto_return: "approved",
      statement_descriptor: "EDICION SIMPLE",
    }),
  });

  if (!res.ok) {
    throw new Error(`Mercado Pago rechazó la preferencia (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string; init_point: string };
  return { id: data.id, initPoint: data.init_point };
}

export type MpPayment = {
  id: number;
  status: "approved" | "pending" | "authorized" | "in_process" | "in_mediation" | "rejected" | "cancelled" | "refunded" | "charged_back";
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
};

export async function getPayment(paymentId: string, accessToken: string): Promise<MpPayment> {
  const res = await fetch(`${API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`No se pudo consultar el pago ${paymentId} (${res.status})`);
  }
  return (await res.json()) as MpPayment;
}

// Valida la firma del webhook (header x-signature: "ts=...,v1=...").
// https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
export function verifyWebhookSignature(opts: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string;
  secret: string;
}): boolean {
  if (!opts.xSignature) return false;

  const parts = Object.fromEntries(
    opts.xSignature.split(",").map((part) => {
      const [k, ...v] = part.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  // Si el id es alfanumérico, Mercado Pago lo firma en minúsculas.
  const id = opts.dataId.toLowerCase();
  let manifest = `id:${id};`;
  if (opts.xRequestId) manifest += `request-id:${opts.xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", opts.secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
