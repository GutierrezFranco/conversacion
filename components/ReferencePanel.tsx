"use client";

import { useRef, useState } from "react";
import { api, uploadFile } from "@/lib/client";
import { COPY_OPTIONS, type CopyOption } from "@/lib/reference";

type Props = { baseStyleId: string; onReady: (styleId: string) => void; onCancel: () => void };

// Subir un reel (o captura) que te guste y copiar sus subtítulos, animación o ritmo.
export function ReferencePanel({ baseStyleId, onReady, onCancel }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [copy, setCopy] = useState<CopyOption[]>(COPY_OPTIONS.map((o) => o.id));
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  function toggle(id: CopyOption) {
    setCopy((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function analyze() {
    if (!file) return;
    setError("");
    try {
      setStatus("uploading");
      const path = await uploadFile(file, "ref", setProgress);
      setStatus("analyzing");
      const { job } = await api<{ job: { id: string } }>("/api/jobs", { kind: "reference", path, name: file.name, copy, details, baseStyleId });

      // El análisis tarda menos de un minuto: consultamos cada 3 segundos.
      for (;;) {
        await new Promise((r) => setTimeout(r, 3000));
        const { job: j } = await api<{ job: { status: string; error: string | null; result: { styleId?: string } | null } }>(`/api/jobs/${job.id}`);
        if (j.status === "done" && j.result?.styleId) return onReady(j.result.styleId);
        if (j.status === "failed") throw new Error(j.error ?? "No pudimos analizar la referencia.");
      }
    } catch (e) {
      setError((e as Error).message);
      setStatus("idle");
    }
  }

  const busy = status !== "idle";

  return (
    <div className="card stack" style={{ background: "var(--surface-2)" }}>
      <div>
        <b>Copiar el estilo de una referencia</b>
        <div className="muted small">
          Subí un reel que te guste (o una captura) y le copiamos los subtítulos, la fuente, los colores o el ritmo. Queda guardado en
          «Mis estilos» para tus próximos videos.
        </div>
      </div>

      <div className="dropzone" style={{ padding: 18 }} onClick={() => !busy && input.current?.click()}>
        <input ref={input} type="file" accept="video/*,image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {file ? <b>{file.name}</b> : <b>Elegí el video o la captura de referencia</b>}
        <div className="muted small">Video de hasta 3 minutos o una captura de pantalla</div>
      </div>

      <div>
        <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>
          ¿Qué querés copiar?
        </div>
        <div className="row">
          {COPY_OPTIONS.map((o) => (
            <button key={o.id} className={`btn ${copy.includes(o.id) ? "btn-primary" : ""}`} onClick={() => toggle(o.id)} title={o.hint} disabled={busy}>
              {copy.includes(o.id) ? "✓ " : ""}
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        placeholder="Detalles (opcional). Ej: de acá solo quiero los subtítulos, pero en naranja en vez de amarillo."
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        disabled={busy}
        style={{ minHeight: 70 }}
      />

      {error && <div className="alert">{error}</div>}

      <div className="row">
        <span className="muted small">
          {status === "uploading" ? `Subiendo ${progress}%…` : status === "analyzing" ? "Analizando la referencia, tarda menos de un minuto…" : "Analizarla es gratis."}
        </span>
        <div className="spacer" />
        <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={analyze} disabled={!file || copy.length === 0 || busy}>
          {busy ? "Analizando…" : "Analizar referencia"}
        </button>
      </div>
    </div>
  );
}
