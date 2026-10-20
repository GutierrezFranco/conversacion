"use client";

import { useState } from "react";
import { api } from "@/lib/client";

export function BuyButton({ packId, primary }: { packId: string; primary?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function buy() {
    setLoading(true);
    setError("");
    try {
      const { url } = await api<{ url: string }>("/api/checkout", { packId });
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <>
      <button className={`btn ${primary ? "btn-primary" : ""}`} style={{ width: "100%" }} onClick={buy} disabled={loading}>
        {loading ? "Abriendo el pago seguro…" : "Comprar"}
      </button>
      {error && <div className="alert small">{error}</div>}
    </>
  );
}
