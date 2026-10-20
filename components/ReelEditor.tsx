"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AssetLibrary } from "@/components/AssetLibrary";
import { ReferencePanel } from "@/components/ReferencePanel";
import { StylePreview } from "@/components/StylePreview";
import { FORMATS } from "@/lib/formats";
import { api, uploadFile, type Asset } from "@/lib/client";
import { RAW_MAX_BYTES } from "@/lib/storage-rules";
import { STYLES, type EditStyle } from "@/lib/styles";
import { TEMPLATES, getTemplate, type TemplateInstance } from "@/lib/templates";

type Resource = { asset: Asset; note: string };
type TemplateDraft = TemplateInstance & { key: number };
type CustomStyle = { id: string; name: string; style: EditStyle; analysis: string | null; copied: string[] };

export function ReelEditor({ cost, priceLabel }: { cost: number; priceLabel: string }) {
  const router = useRouter();
  const rawInput = useRef<HTMLInputElement>(null);
  const nextKey = useRef(1);

  const [raw, setRaw] = useState<File | null>(null);
  const [rawPath, setRawPath] = useState<string | null>(null);
  const [rawProgress, setRawProgress] = useState(0);
  const [styleId, setStyleId] = useState(STYLES[0].id);
  const [formatId, setFormatId] = useState(FORMATS[0].id);
  const [customStyles, setCustomStyles] = useState<CustomStyle[]>([]);
  const [showReference, setShowReference] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [music, setMusic] = useState<Asset | null>(null);
  const [musicVolume, setMusicVolume] = useState<"baja" | "media" | "alta">("baja");
  const [showMusic, setShowMusic] = useState(false);
  const [templates, setTemplates] = useState<TemplateDraft[]>([]);
  const [instructions, setInstructions] = useState("");
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function loadStyles() {
    try {
      const { styles } = await api<{ styles: CustomStyle[] }>("/api/styles");
      setCustomStyles(styles);
      return styles;
    } catch {
      return [];
    }
  }

  useEffect(() => {
    loadStyles();
  }, []);

  async function removeStyle(s: CustomStyle) {
    if (!confirm(`¿Borrar el estilo «${s.name}»?`)) return;
    await api(`/api/styles/${s.id}`, undefined, "DELETE").catch(() => null);
    setCustomStyles((prev) => prev.filter((x) => x.id !== s.id));
    if (styleId === s.style.id) setStyleId(STYLES[0].id);
  }

  function pickFormat(id: string) {
    setFormatId(id);
    const f = FORMATS.find((x) => x.id === id);
    // La cajita de preguntas se agrega sola para que solo haya que escribir la pregunta.
    if (f?.suggests && !templates.some((t) => t.templateId === f.suggests)) addTemplate(f.suggests);
    if (f?.wantsResources && resources.length === 0) setShowLibrary(true);
  }

  async function pickRaw(file: File | undefined) {
    if (!file) return;
    if (file.size > RAW_MAX_BYTES) return setError("El video pesa más de 1 GB. Exportalo más liviano.");
    setError("");
    setRaw(file);
    setRawPath(null);
    setRawProgress(0);
    try {
      setRawPath(await uploadFile(file, "raw", setRawProgress));
    } catch (e) {
      setError((e as Error).message);
      setRaw(null);
    }
  }

  function toggleAsset(asset: Asset) {
    setResources((prev) =>
      prev.some((r) => r.asset.id === asset.id)
        ? prev.filter((r) => r.asset.id !== asset.id)
        : prev.length >= 10
          ? prev
          : [...prev, { asset, note: "" }],
    );
  }

  function addTemplate(templateId: string) {
    if (templates.length >= 8) return;
    setTemplates((prev) => [...prev, { key: nextKey.current++, templateId, values: {}, note: "" }]);
  }

  function updateTemplate(key: number, patch: Partial<TemplateInstance>) {
    setTemplates((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch, values: { ...t.values, ...patch.values } } : t)));
  }

  const missingTemplate = templates.find((t) =>
    getTemplate(t.templateId)?.fields.some((f) => !f.optional && !(t.values[f.key] ?? "").trim()),
  );
  const uploading = raw && !rawPath;

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
        formatId,
        instructions,
        resources: resources.map((r) => ({ path: r.asset.path, name: r.asset.name, kind: r.asset.kind, note: r.note })),
        templates: templates.map(({ templateId, values, note }) => ({ templateId, values, note })),
        ...(music ? { music: { path: music.path, name: music.name, volume: musicVolume } } : {}),
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
        <h1>Editá tu reel</h1>
        <p className="muted" style={{ margin: 0 }}>
          Subí tu crudo, elegí un estilo y te lo devolvemos cortado, con subtítulos y tus recursos.
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
            <div className="muted small">Arrastralo acá o tocá para elegirlo · MP4 o MOV hasta 1 GB y 5 minutos</div>
          </>
        )}
      </div>

      <div>
        <h3>¿Qué tipo de video es?</h3>
        <div className="grid grid-4">
          {FORMATS.map((f) => (
            <button key={f.id} className={`card selectable ${formatId === f.id ? "selected" : ""}`} onClick={() => pickFormat(f.id)}>
              <b>{f.name}</b>
              <p className="muted small" style={{ margin: "8px 0 0" }}>
                {f.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3>Elegí el estilo</h3>
        <div className="grid grid-3">
          {customStyles.map((c) => (
            <div key={c.id} className={`card selectable ${styleId === c.style.id ? "selected" : ""}`} onClick={() => setStyleId(c.style.id)} role="button">
              <div className="row">
                <b>{c.name}</b>
                <span className="pill pill-accent">Mi estilo</span>
                <div className="spacer" />
                <button
                  className="btn btn-ghost small"
                  style={{ padding: "4px 10px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStyle(c);
                  }}
                >
                  Borrar
                </button>
              </div>
              {c.analysis && (
                <p className="muted small" style={{ margin: "8px 0 0" }}>
                  {c.analysis}
                </p>
              )}
              <StylePreview style={c.style} />
            </div>
          ))}
          {STYLES.map((s) => (
            <button key={s.id} className={`card selectable ${styleId === s.id ? "selected" : ""}`} onClick={() => setStyleId(s.id)}>
              <b>{s.name}</b> <span className="pill" style={{ marginLeft: 6 }}>{s.tagline}</span>
              <p className="muted small" style={{ margin: "8px 0 0" }}>
                {s.description}
              </p>
              <StylePreview style={s} />
            </button>
          ))}
          {!showReference && (
            <button className="card selectable" style={{ borderStyle: "dashed" }} onClick={() => setShowReference(true)}>
              <b>+ Agregar referencia</b>
              <p className="muted small" style={{ margin: "8px 0 0" }}>
                ¿Viste un reel con subtítulos que te encantan? Subilo y copiamos la fuente, los colores, la animación o el ritmo.
              </p>
            </button>
          )}
        </div>
        {showReference && (
          <div style={{ marginTop: 14 }}>
            <ReferencePanel
              baseStyleId={styleId.startsWith("custom:") ? STYLES[0].id : styleId}
              onCancel={() => setShowReference(false)}
              onReady={async (id) => {
                await loadStyles();
                setStyleId(id);
                setShowReference(false);
              }}
            />
          </div>
        )}
      </div>

      <div className="card stack">
        <div className="row">
          <div style={{ flex: 1, minWidth: 220 }}>
            <b>Recursos</b>
            <div className="muted small">Capturas, tu logo, fotos de antes y después. Contá para qué es cada uno y dónde va.</div>
          </div>
          <button className="btn" onClick={() => setShowLibrary((v) => !v)}>
            {showLibrary ? "Listo" : resources.length ? "Agregar más" : "Elegir de mi carpeta"}
          </button>
        </div>

        {showLibrary && (
          <AssetLibrary
            mode="pick"
            kinds={["image", "video"]}
            picked={resources.map((r) => r.asset.id)}
            onPick={toggleAsset}
            onUploaded={(a) => setResources((prev) => (prev.length >= 10 ? prev : [...prev, { asset: a, note: "" }]))}
          />
        )}

        {resources.map((r) => (
          <div key={r.asset.id} className="row" style={{ alignItems: "flex-start" }}>
            {r.asset.url && r.asset.kind === "image" ? (
              <img className="mini-thumb" src={r.asset.url} alt="" />
            ) : (
              <div className="mini-thumb" style={{ display: "grid", placeItems: "center" }}>
                ▶
              </div>
            )}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="small" style={{ marginBottom: 6 }}>
                {r.asset.name}
              </div>
              <input
                type="text"
                placeholder="¿Para qué es? Ej: foto del módulo roto, mostrala cuando digo «así llegó el equipo»"
                value={r.note}
                onChange={(e) => setResources((prev) => prev.map((x) => (x.asset.id === r.asset.id ? { ...x, note: e.target.value } : x)))}
              />
            </div>
            <button className="btn btn-ghost" onClick={() => toggleAsset(r.asset)}>
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div className="card stack">
        <div className="row">
          <div style={{ flex: 1, minWidth: 220 }}>
            <b>Música de fondo (opcional)</b>
            <div className="muted small">
              {music ? `♪ ${music.name}` : "Elegí un tema de tu carpeta. Baja sola cuando hablás y se apaga al final."}
            </div>
          </div>
          {music && (
            <div className="row">
              {(["baja", "media", "alta"] as const).map((v) => (
                <button key={v} className={`btn ${musicVolume === v ? "btn-primary" : ""}`} onClick={() => setMusicVolume(v)}>
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
              <button className="btn btn-ghost" onClick={() => setMusic(null)}>
                Quitar
              </button>
            </div>
          )}
          <button className="btn" onClick={() => setShowMusic((v) => !v)}>
            {showMusic ? "Listo" : music ? "Cambiar" : "Elegir música"}
          </button>
        </div>
        {showMusic && (
          <AssetLibrary
            mode="pick"
            kinds={["audio"]}
            picked={music ? [music.id] : []}
            onPick={(a) => {
              setMusic((m) => (m?.id === a.id ? null : a));
              setShowMusic(false);
            }}
            onUploaded={(a) => {
              setMusic(a);
              setShowMusic(false);
            }}
          />
        )}
        <div className="muted small">Usá música sin copyright: si no, Instagram o TikTok pueden silenciar el video.</div>
      </div>

      <div className="card stack">
        <div>
          <b>Plantillas</b>
          <div className="muted small">Carteles listos: escribís el texto y aparecen en el momento justo. Sin costo extra.</div>
        </div>
        <div className="row">
          {TEMPLATES.map((t) => (
            <button key={t.id} className="btn" onClick={() => addTemplate(t.id)} title={t.description}>
              + {t.name}
            </button>
          ))}
        </div>

        {templates.map((t) => {
          const def = getTemplate(t.templateId)!;
          return (
            <div key={t.key} className="card stack" style={{ background: "var(--surface-2)" }}>
              <div className="row">
                <b>{def.name}</b>
                <span className="muted small">{def.description}</span>
                <div className="spacer" />
                <button className="btn btn-ghost" onClick={() => setTemplates((prev) => prev.filter((x) => x.key !== t.key))}>
                  Quitar
                </button>
              </div>
              <div className="grid grid-3">
                {def.fields.map((f) => (
                  <div key={f.key}>
                    <label className="small">
                      {f.label}
                      {f.optional && <span className="muted"> (opcional)</span>}
                    </label>
                    <input
                      type="text"
                      maxLength={f.maxLength}
                      placeholder={f.placeholder}
                      value={t.values[f.key] ?? ""}
                      onChange={(e) => updateTemplate(t.key, { values: { [f.key]: e.target.value } })}
                    />
                  </div>
                ))}
              </div>
              <input
                type="text"
                placeholder="¿Cuándo aparece? (opcional) Ej: cuando digo «el presupuesto»"
                value={t.note}
                onChange={(e) => updateTemplate(t.key, { note: e.target.value })}
              />
            </div>
          );
        })}
      </div>

      <div className="card">
        <label htmlFor="instr">Indicaciones extra (opcional)</label>
        <textarea
          id="instr"
          placeholder="Ej: cortá la parte donde me trabo al principio, el cierre que diga «Escribime por WhatsApp»."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="row">
        <span className="muted">
          Cuesta <b style={{ color: "var(--text)" }}>{cost} créditos ({priceLabel})</b>. Si algo falla, te los devolvemos.
        </span>
        <div className="spacer" />
        <button className="btn btn-primary" disabled={!rawPath || !!uploading || sending || !!missingTemplate} onClick={submit}>
          {sending
            ? "Enviando…"
            : uploading
              ? "Esperá que termine de subir…"
              : missingTemplate
                ? `Completá la plantilla ${getTemplate(missingTemplate.templateId)?.name}`
                : "Editar mi video"}
        </button>
      </div>
    </div>
  );
}
