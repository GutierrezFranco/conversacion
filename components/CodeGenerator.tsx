"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

const PRESETS = [
  { label: "1 video", credits: 10 },
  { label: "3 videos", credits: 30 },
  { label: "5 videos", credits: 50 },
  { label: "10 videos", credits: 100 },
];

export function CodeGenerator() {
  const router = useRouter();
  const [credits, setCredits] = useState(30);
  const [maxUses, setMaxUses] = useState(1);
  const [note, setNote] = useState("");
  const [custom, setCustom] = useState("");
  const [days, setDays] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    setError("");
    setCreated(null);
    try {
      const { code } = await api<{ code: { code: string } }>("/api/admin/codes", {
        credits,
        maxUses,
        note,
        ...(custom.trim() ? { code: custom.trim() } : {}),
        ...(days ? { expiresInDays: Number(days) } : {}),
      });
      setCreated(code.code);
      setNote("");
      setCustom("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card stack">
      <h3 style={{ margin: 0 }}>Nuevo código de regalo</h3>
      <div className="row">
        {PRESETS.map((p) => (
          <button key={p.credits} className={`btn ${credits === p.credits ? "btn-primary" : ""}`} onClick={() => setCredits(p.credits)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-4">
        <div>
          <label className="small">Créditos</label>
          <input type="text" inputMode="numeric" value={credits} onChange={(e) => setCredits(Number(e.target.value.replace(/\D/g, "")) || 0)} />
        </div>
        <div>
          <label className="small">Cuántas personas lo pueden usar</label>
          <input type="text" inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value.replace(/\D/g, "")) || 1)} />
        </div>
        <div>
          <label className="small">Vence en (días, opcional)</label>
          <input type="text" inputMode="numeric" placeholder="Sin vencimiento" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} />
        </div>
        <div>
          <label className="small">Código (opcional)</label>
          <input type="text" placeholder="Se genera solo" value={custom} onChange={(e) => setCustom(e.target.value.toUpperCase())} />
        </div>
      </div>
      <input type="text" placeholder="Nota interna: para quién es (ej: Juan, alumno MDM)" value={note} onChange={(e) => setNote(e.target.value)} />
      {error && <div className="alert">{error}</div>}
      {created && (
        <div className="alert alert-ok row">
          <span>
            Código listo: <b style={{ fontSize: "1.1rem", letterSpacing: "0.05em" }}>{created}</b>
          </span>
          <div className="spacer" />
          <button className="btn" onClick={() => navigator.clipboard.writeText(created)}>
            Copiar
          </button>
        </div>
      )}
      <div className="row">
        <span className="muted small">
          Se canjea en Créditos → «¿Tenés un código de regalo?». {credits} créditos = {Math.floor(credits / 10)} videos normales.
        </span>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={create} disabled={loading || credits < 1}>
          {loading ? "Creando…" : "Crear código"}
        </button>
      </div>
    </div>
  );
}
