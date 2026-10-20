"use client";

import { useEffect, useRef, useState } from "react";
import { uploadAsset } from "@/lib/client";
import { STICKER_KINDS, drawSticker, type StickerKind } from "@/lib/stickers";

const ACCENTS = ["#FF6A1A", "#FE2C55", "#8A3AB9", "#1D9BF0", "#25D366", "#111111"];

export function StickerMaker() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<StickerKind>("tiktok");
  const [username, setUsername] = useState("cliente_feliz");
  const [text, setText] = useState("¿Cuánto sale cambiarle la batería a un iPhone 12?");
  const [title, setTitle] = useState(STICKER_KINDS[0].defaultTitle);
  const [theme, setTheme] = useState<"claro" | "oscuro">("claro");
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [avatar, setAvatar] = useState<HTMLImageElement | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // El canvas no espera a las fuentes web: las cargamos antes de dibujar.
  useEffect(() => {
    Promise.all(["500", "600", "700", "800"].map((w) => document.fonts.load(`${w} 40px Poppins`)))
      .catch(() => null)
      .finally(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) drawSticker(ctx, { kind, username, text, title, theme, accent, avatar });
  }, [kind, username, text, title, theme, accent, avatar, fontsReady]);

  function pickKind(k: StickerKind) {
    setKind(k);
    setTitle(STICKER_KINDS.find((s) => s.id === k)!.defaultTitle);
  }

  function pickAvatar(file: File | undefined) {
    if (!file) return;
    const img = new Image();
    img.onload = () => setAvatar(img);
    img.src = URL.createObjectURL(file);
  }

  function toBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => canvas.current!.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen."))), "image/png"));
  }

  const fileName = () => `cajita-${kind}-${Date.now()}.png`;

  async function download() {
    const url = URL.createObjectURL(await toBlob());
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName();
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveToLibrary() {
    setSaving(true);
    setMessage("");
    try {
      await uploadAsset(new File([await toBlob()], fileName(), { type: "image/png" }));
      setMessage("Guardada en tu carpeta. Ya la podés sumar como recurso en tu próximo reel.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <h1>Cajitas y comentarios</h1>
        <p className="muted" style={{ margin: 0 }}>
          Armá la burbuja de «responder comentario» o la cajita de preguntas para tus videos. Bajala en PNG transparente o
          guardala en tu carpeta. Gratis e ilimitado.
        </p>
      </div>

      <div className="grid grid-3">
        {STICKER_KINDS.map((s) => (
          <button key={s.id} className={`card selectable ${kind === s.id ? "selected" : ""}`} onClick={() => pickKind(s.id)}>
            <b>{s.name}</b>
            <p className="muted small" style={{ margin: "6px 0 0" }}>
              {s.description}
            </p>
          </button>
        ))}
      </div>

      <div className="row" style={{ alignItems: "flex-start", gap: 24 }}>
        <div className="card stack" style={{ flex: "1 1 320px" }}>
          {kind !== "pregunta" && (
            <div>
              <label htmlFor="user">Usuario</label>
              <input id="user" type="text" maxLength={30} value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
          )}
          {kind !== "instagram" && (
            <div>
              <label htmlFor="title">{kind === "tiktok" ? "Texto de arriba" : "Título"}</label>
              <input id="title" type="text" maxLength={40} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          )}
          <div>
            <label htmlFor="text">{kind === "pregunta" ? "Pregunta" : "Comentario"}</label>
            <textarea id="text" maxLength={220} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="row">
            <button className={`btn ${theme === "claro" ? "btn-primary" : ""}`} onClick={() => setTheme("claro")}>
              Claro
            </button>
            <button className={`btn ${theme === "oscuro" ? "btn-primary" : ""}`} onClick={() => setTheme("oscuro")}>
              Oscuro
            </button>
            <div className="spacer" />
            {ACCENTS.map((c) => (
              <button
                key={c}
                aria-label={`Color ${c}`}
                onClick={() => setAccent(c)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: c,
                  border: accent === c ? "3px solid var(--text)" : "1px solid var(--border)",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
          {kind !== "pregunta" && (
            <div className="row">
              <input ref={avatarInput} type="file" accept="image/*" hidden onChange={(e) => pickAvatar(e.target.files?.[0])} />
              <button className="btn" onClick={() => avatarInput.current?.click()}>
                {avatar ? "Cambiar foto de perfil" : "Subir foto de perfil (opcional)"}
              </button>
              {avatar && (
                <button className="btn btn-ghost" onClick={() => setAvatar(null)}>
                  Quitar foto
                </button>
              )}
            </div>
          )}
        </div>

        <div className="stack" style={{ flex: "1 1 320px" }}>
          <div className="sticker-stage">
            <canvas ref={canvas} style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
          <div className="row">
            <button className="btn btn-primary" onClick={download} disabled={!text.trim()}>
              Descargar PNG
            </button>
            <button className="btn" onClick={saveToLibrary} disabled={!text.trim() || saving}>
              {saving ? "Guardando…" : "Guardar en mi carpeta"}
            </button>
          </div>
          {message && <div className="muted small">{message}</div>}
        </div>
      </div>
    </div>
  );
}
