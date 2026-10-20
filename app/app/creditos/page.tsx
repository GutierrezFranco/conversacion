import { BuyButton } from "@/components/BuyButton";
import { PromoForm } from "@/components/PromoForm";
import { getBalance } from "@/lib/api";
import { CREDIT_PRICE_ARS, EDIT_CREDITS, ITERATION_CREDITS, PACKS, formatArs, pricePerVideo } from "@/lib/pricing";
import { createClient, getUser } from "@/lib/supabase/server";

const REASON_LABEL: Record<string, string> = {
  signup_bonus: "Regalo de bienvenida",
  purchase: "Compra",
  job_charge: "Uso",
  job_refund: "Devolución",
  admin: "Ajuste",
  promo: "Código de regalo",
};

const STATUS_MESSAGE: Record<string, { text: string; ok: boolean }> = {
  aprobado: { text: "¡Pago aprobado! Los créditos se acreditan en unos segundos.", ok: true },
  pendiente: { text: "Tu pago está pendiente. Te acreditamos los créditos apenas Mercado Pago lo confirme.", ok: true },
  rechazado: { text: "El pago no se completó. Probá con otro medio de pago.", ok: false },
};

export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const user = (await getUser())!;
  const balance = await getBalance(user.id);
  const supabase = await createClient();
  const { data: movements } = await supabase
    .from("credit_ledger")
    .select("id, delta, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  const message = estado ? STATUS_MESSAGE[estado] : undefined;

  return (
    <div className="stack">
      <div>
        <h1>Créditos</h1>
        <p className="muted" style={{ margin: 0 }}>
          Tenés <b style={{ color: "var(--text)" }}>{balance} créditos</b>
          {balance >= EDIT_CREDITS ? ` (alcanza para ${Math.floor(balance / EDIT_CREDITS)} ${Math.floor(balance / EDIT_CREDITS) === 1 ? "video" : "videos"})` : ""}. Un
          video editado son {EDIT_CREDITS} créditos ({formatArs(EDIT_CREDITS * CREDIT_PRICE_ARS)}) y cada ronda de cambios,{" "}
          {ITERATION_CREDITS} ({formatArs(ITERATION_CREDITS * CREDIT_PRICE_ARS)}).
        </p>
      </div>

      {message && <div className={`alert ${message.ok ? "alert-ok" : ""}`}>{message.text}</div>}

      <div className="grid grid-3">
        {PACKS.map((p) => (
          <div key={p.id} className={`card stack ${p.highlight ? "selectable selected" : ""}`}>
            <div className="row">
              <h3 style={{ margin: 0 }}>{p.name}</h3>
              {p.highlight && <span className="pill pill-accent">Más elegido</span>}
            </div>
            <div className="price">{formatArs(p.priceArs)}</div>
            <div className="muted">
              {p.credits} créditos · {formatArs(pricePerVideo(p))} por video
            </div>
            <BuyButton packId={p.id} primary={p.highlight} />
          </div>
        ))}
      </div>
      <div className="secure-pay">
        <span>🔒</span>
        <div>
          <b>Pago seguro con Mercado Pago</b>
          <div className="muted small">Tarjeta de crédito, débito, dinero en cuenta o efectivo. Los créditos se acreditan apenas se aprueba el pago y no vencen.</div>
        </div>
      </div>

      <PromoForm />

      {movements && movements.length > 0 && (
        <div className="card">
          <h3>Movimientos</h3>
          {movements.map((m) => (
            <div key={m.id} className="row" style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <span>{REASON_LABEL[m.reason] ?? m.reason}</span>
              <span className="muted small">{new Date(m.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span>
              <div className="spacer" />
              <b style={{ color: m.delta > 0 ? "var(--ok)" : "var(--text)" }}>
                {m.delta > 0 ? "+" : ""}
                {m.delta}
              </b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
