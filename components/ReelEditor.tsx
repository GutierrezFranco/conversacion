"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, uploadFile } from "@/lib/client";
import { STYLES } from "@/lib/styles";

type Resource = { file: File; path?: string; progress: number; note: string; kind: "image" | "video" };

export function ReelEditor({ cost }: { cost: number }) {
  const router = useRouter();
  const rawInput = useRef<HTMLInputElement>(null);
  const resInput = useRef<HTMLInputElement>(null);

  const [raw, setRaw] = useState<File | null>(null);
  const [rawPath, setRawPath] = useState<string | null>(null);
  const [rawProgress, setRawProgress] = useState(0);
  const [styleId, setStyleId] = useState(STYLES[0].id);
  const [resources, setResources] = useState<Resource[]>([]);
  const [showResources, setShowResources] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function pickRaw(file: File | undefined) {
    if (!file) return;
    if (file.size > 1024 * 1024 * 1024) return setError("El video pesa más de 1 GB. Exportalo más liviano.");
    setError("");
    setRaw(file);
    setRawPath(null);
    setRawProgress(0);
    try {
      setRawPath(await uploadFile(file, setRawProgress));
    } catch (e) {
      setError((e as Error).message);
      setRaw(null);
    }
  }

  async function addResources(files: FileList | null) {
    if (!files) return;
    const added: Resource[] = Array.from(files)
      .slice(0, 10 - resources.length)
      .filter((f) => f.size <= 50 * 1024 * 1024)
      .map((file) => ({ file, progress: 0, note: "", kind: file.type.startsWith("video") ? "video" : "image" }));
    setResources((prev) => [...prev, ...added]);
    for (const r of added) {
      try {
        const path = await uploadFile(r.file, (p) => update(r.file, { progress: p }));
        update(r.file, { path, progress: 100 });
      } catch {
        setError(`No se pudo subir ${r.file.name}.`);
        setResources((prev) => prev.filter((x) => x.file !== r.file));
      }
    }
  }

  function update(file: File, patch: Partial<Resource>) {
    setResources((prev) => prev.map((r) => (r.file === file ? { ...r, ...patch } : r)));
  }

  const uploading = (raw && !rawPath) || resources.some((r) => !r.path);

  async function submit() {
    if (!rawPath) return;
    setSending(true);
    setError("");
    try {
      const { job } = await api<{ job: { id: string } }>("/api/jobs", {
        kind: "edit",
        title: raw?.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Mi reel",
        rawPath,
        styleId,
        instructions,
        resources: resources.map((r) => ({ path: r.path!, name: r.file.name, kind: r.kind, note: r.note })),
      });
      router.push(`/app/reel/${job.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSending(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <h1>Editá tu reel con IA</h1>
        <p className="muted" style={{ margin: 0 }}>
          Subí tu crudo, elegí un estilo y nosotros lo editamos por vos.
        </p>
      </div>

      <div
        className={`dropzone ${drag ? "drag" : ""}`}
        onClick={() => rawInput.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pickRaw(e.dataTransfer.files[0]);
        }}
      >
        <input ref={rawInput} type="file" accept="video/mp4,video/quicktime,video/webm" hidden onChange={(e) => pickRaw(e.target.files?.[0])} />
        <div className="icon-circle">↑</div>
        {raw ? (
          <>
            <b>{raw.name}</b>
            <div className="muted small">
              {(raw.size / 1024 / 1024).toFixed(0)} MB · {rawPath ? "Subido ✓ · tocá para cambiarlo" : `Subiendo ${rawProgress}%`}
            </div>
            {!rawPath && (
              <div className="progress" style={{ maxWidth: 320, margin: "12px auto 0" }}>
                <div style={{ width: `${rawProgress}%` }} />
              </div>
            )}
          </>
        ) : (
          <>
            <b>Subí tu video</b>
            <div className="muted small">Arrastralo acá o tocá para elegirlo · MP4 o MOV hasta 1 GB</div>
          </>
        )}
      </div>

      <div>
        <h3>Elegí tu estilo de edición</h3>
        <div className="grid grid-3">
          {STYLES.map((s) => (
            <button key={s.id} className={`card selectable ${styleId === s.id ? "selected" : ""}`} onClick={() => setStyleId(s.id)}>
              <b>{s.name}</b> <span className="pill" style={{ marginLeft: 6 }}>{s.tagline}</span>
              <p className="muted small" style={{ margin: "8px 0 0" }}>
                {s.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="card stack">
        <div className="row">
          <div>
            <b>¿Querés agregar recursos?</b>
            <div className="muted small">Capturas, tu logo, b-roll o fotos de producto para que aparezcan en la edición.</div>
          </div>
          <div className="spacer" />
          {!showResources && (
            <button className="btn" onClick={() => setShowResources(true)}>
              Sí, agregar
            </button>
          )}
        </div>

        {showResources && (
          <>
            <div className="dropzone" style={{ padding: 20 }} onClick={() => resInput.current?.click()}>
              <input ref={resInput} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => addResources(e.target.files)} />
              <b>Agregá recursos</b>
              <div className="muted small">Imágenes o videos de hasta 50 MB cada uno (máximo 10)</div>
            </div>
            {resources.map((r) => (
              <div key={r.file.name + r.file.size} className="row" style={{ alignItems: "flex-start" }}>
                <span className="pill">{r.kind === "video" ? "Video" : "Imagen"}</span>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div className="small" style={{ marginBottom: 6 }}>
                    {r.file.name} {r.path ? "✓" : `· ${r.progress}%`}
                  </div>
                  <input
                    type="text"
                    placeholder="¿Para qué es? Ej: captura de la herramienta, mostrala cuando digo «entrás a la página»"
                    value={r.note}
                    onChange={(e) => update(r.file, { note: e.target.value })}
                  />
                </div>
                <button className="btn btn-ghost" onClick={() => setResources((prev) => prev.filter((x) => x !== r))}>
                  Quitar
                </button>
              </div>
            ))}
          </>
        )}

        <div>
          <label htmlFor="instr">Indicaciones extra (opcional)</label>
          <textarea
            id="instr"
            placeholder="Ej: cortá la parte donde me trabo al principio, el cierre que diga «Comentá GUÍA»."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="row">
        <span className="muted">
          Cuesta <b style={{ color: "var(--text)" }}>{cost} créditos</b>. Si algo falla, te los devolvemos.
        </span>
        <div className="spacer" />
        <button className="btn btn-primary" disabled={!rawPath || !!uploading || sending} onClick={submit}>
          {sending ? "Enviando…" : uploading ? "Esperá que termine de subir…" : "Editar mi video"}
        </button>
      </div>
    </div>
  );
}
