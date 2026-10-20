"use client";

import { useState } from "react";
import { api } from "@/lib/client";

export function WithdrawalForm() {
  const [email, setEmail] = useState("");
  const [purchaseInfo, setPurchaseInfo] = useState("");
  const [details, setDetails] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api<{ code: string }>("/api/arrepentimiento", { email, purchaseInfo, details });
      setCode(res.code);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (code) {
    return (
      <div className="alert alert-ok">
        Recibimos tu pedido. Tu número de trámite es <b>{code}</b>. Te vamos a escribir a <b>{email}</b> para confirmar la devolución.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card stack">
      <div>
        <label htmlFor="w-email">Tu mail (el de tu cuenta)</label>
        <input id="w-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="w-purchase">Qué compraste y cuándo (opcional)</label>
        <input id="w-purchase" type="text" placeholder="Ej: paquete de 5 videos, el 18 de octubre" value={purchaseInfo} onChange={(e) => setPurchaseInfo(e.target.value)} />
      </div>
      <div>
        <label htmlFor="w-details">Comentarios (opcional)</label>
        <textarea id="w-details" value={details} onChange={(e) => setDetails(e.target.value)} />
      </div>
      {error && <div className="alert">{error}</div>}
      <button className="btn btn-primary" disabled={loading}>
        {loading ? "Enviando…" : "Quiero arrepentirme de mi compra"}
      </button>
    </form>
  );
}
