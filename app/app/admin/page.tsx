import { notFound } from "next/navigation";
import { CodeGenerator } from "@/components/CodeGenerator";
import { isAdmin } from "@/lib/admin";
import { formatArs } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";

export const metadata = { title: "Administración" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function count(table: string, filter?: (q: any) => any) {
  let q = createAdminClient().from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count } = await q;
  return count ?? 0;
}

export default async function AdminPage() {
  const user = await getUser();
  if (!isAdmin(user?.email)) notFound();

  const admin = createAdminClient();
  const week = new Date(Date.now() - 7 * 86400000).toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [users, editsWeek, failedWeek, pending] = await Promise.all([
    count("profiles"),
    count("jobs", (q) => q.eq("kind", "edit").gte("created_at", week)),
    count("jobs", (q) => q.eq("status", "failed").gte("created_at", week)),
    count("jobs", (q) => q.in("status", ["queued", "processing"])),
  ]);
  const { data: sales } = await admin.from("purchases").select("amount_ars").eq("status", "approved").gte("approved_at", monthStart);
  const revenue = (sales ?? []).reduce((sum, p) => sum + Number(p.amount_ars), 0);
  const { data: codes } = await admin.from("promo_codes").select("*").order("created_at", { ascending: false }).limit(50);
  const { data: failures } = await admin
    .from("jobs")
    .select("id, title, error, created_at")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: withdrawals } = await admin
    .from("withdrawal_requests")
    .select("*")
    .eq("status", "pendiente")
    .order("created_at", { ascending: false })
    .limit(20);

  const stats = [
    { label: "Usuarios", value: users },
    { label: "Ediciones (7 días)", value: editsWeek },
    { label: "En cola ahora", value: pending },
    { label: "Fallidas (7 días)", value: failedWeek },
    { label: "Ventas del mes", value: formatArs(revenue) },
  ];

  return (
    <div className="stack">
      <div>
        <h1>Administración</h1>
        <p className="muted" style={{ margin: 0 }}>
          Solo lo ven los mails de ADMIN_EMAILS.
        </p>
        {/* Vercel completa estas variables en cada publicación: sirve para saber si ya está andando el último cambio. */}
        <p className="muted small" style={{ margin: "4px 0 0" }}>
          Versión publicada: <b>{process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"}</b>
          {process.env.VERCEL_GIT_COMMIT_MESSAGE ? ` · ${process.env.VERCEL_GIT_COMMIT_MESSAGE.split("\n")[0]}` : ""}
        </p>
      </div>

      <div className="grid grid-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="muted small">{s.label}</div>
            <div className="price" style={{ fontSize: "1.7rem" }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <CodeGenerator />

      <div className="card">
        <h3>Códigos</h3>
        {(codes ?? []).length === 0 && <div className="muted small">Todavía no creaste códigos.</div>}
        {(codes ?? []).map((c) => (
          <div key={c.code} className="row" style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
            <b style={{ letterSpacing: "0.04em", minWidth: 140 }}>{c.code}</b>
            <span className="muted small">{c.credits} créditos</span>
            <span className={`pill ${c.uses >= c.max_uses ? "" : "pill-ok"}`}>
              {c.uses}/{c.max_uses} usados
            </span>
            {c.expires_at && <span className="muted small">vence {new Date(c.expires_at).toLocaleDateString("es-AR")}</span>}
            <div className="spacer" />
            <span className="muted small">{c.note}</span>
          </div>
        ))}
      </div>

      {(withdrawals ?? []).length > 0 && (
        <div className="card">
          <h3>Pedidos de arrepentimiento pendientes</h3>
          <p className="muted small">Devolvé el pago desde Mercado Pago y marcá el pedido como resuelto en la tabla withdrawal_requests.</p>
          {(withdrawals ?? []).map((w) => (
            <div key={w.id} className="row" style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <b>ARR-{String(w.id).padStart(5, "0")}</b>
              <span>{w.email}</span>
              <span className="muted small">{new Date(w.created_at).toLocaleDateString("es-AR")}</span>
              <div className="spacer" />
              <span className="muted small">{[w.purchase_info, w.details].filter(Boolean).join(" · ")}</span>
            </div>
          ))}
        </div>
      )}

      {(failures ?? []).length > 0 && (
        <div className="card">
          <h3>Últimas ediciones fallidas</h3>
          {(failures ?? []).map((f) => (
            <div key={f.id} className="row" style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <span>{f.title}</span>
              <span className="muted small">{new Date(f.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span>
              <div className="spacer" />
              <span className="muted small">{f.error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
