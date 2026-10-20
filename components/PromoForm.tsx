"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function PromoForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { credits } = await api<{ credits: number }>("/api/promo", { code });
      setMessage({ text: `¡Listo! Te sumamos ${credits} créditos.`, ok: true });
      setCode("");
      router.refresh();
    } catch (err) {
      setMessage({ text: (err as Error).message, ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={redeem} className="card stack">
      <b>¿Tenés un código de regalo?</b>
      <div className="row">
        <input type="text" placeholder="EJ: MDM-PRUEBA" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} style={{ flex: 1, minWidth: 180 }} />
        <button className="btn" disabled={code.trim().length < 3 || loading}>
          {loading ? "Canjeando…" : "Canjear"}
        </button>
      </div>
      {message && <div className={`alert ${message.ok ? "alert-ok" : ""}`}>{message.text}</div>}
    </form>
  );
}
