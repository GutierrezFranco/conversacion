import { BuyButton } from "@/components/BuyButton";
import { getBalance } from "@/lib/api";
import { EDIT_CREDITS, PACKS, packPriceArs } from "@/lib/pricing";
import { createClient, getUser } from "@/lib/supabase/server";

const REASON_LABEL: Record<string, string> = {
  signup_bonus: "Regalo de bienvenida",
  purchase: "Compra",
  job_charge: "Uso",
  job_refund: "Devolución",
  admin: "Ajuste",
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
  const arsPerUsd = Number(process.env.ARS_PER_USD ?? 1450);
  const message = estado ? STATUS_MESSAGE[estado] : undefined;

  return (
    <div className="stack">
      <div>
        <h1>Créditos</h1>
        <p className="muted" style={{ margin: 0 }}>
          Tenés <b style={{ color: "var(--text)" }}>{balance} créditos</b>. Una edición cuesta {EDIT_CREDITS}.
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
            <div className="price">${packPriceArs(p, arsPerUsd).toLocaleString("es-AR")}</div>
            <div className="muted">
              {p.credits} créditos · unas {Math.floor(p.credits / EDIT_CREDITS)} ediciones
            </div>
            <BuyButton packId={p.id} primary={p.highlight} />
          </div>
        ))}
      </div>
      <p className="muted small">Pagás con Mercado Pago: tarjeta, débito, dinero en cuenta o efectivo. Los créditos no vencen.</p>

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
