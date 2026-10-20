"use client";

import { useEffect, useRef, useState } from "react";
import { api, uploadAsset, type Asset } from "@/lib/client";
import { formatBytes } from "@/lib/storage-rules";

type Props =
  | { mode: "manage" }
  | { mode: "pick"; picked: string[]; onPick: (asset: Asset) => void; onUploaded?: (asset: Asset) => void };

// Carpeta de recursos en la nube: ver, subir, borrar y (en el editor) elegir para un reel.
export function AssetLibrary(props: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [used, setUsed] = useState(0);
  const [quota, setQuota] = useState(1);
  const [uploading, setUploading] = useState<{ name: string; pct: number }[]>([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await api<{ assets: Asset[]; usedBytes: number; quotaBytes: number }>("/api/assets");
      setAssets(data.assets);
      setUsed(data.usedBytes);
      setQuota(data.quotaBytes);
    } catch (e) {
      setError((e as Error).message);
      setAssets([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function upload(files: FileList | null) {
    if (!files) return;
    setError("");
    for (const file of Array.from(files)) {
      setUploading((u) => [...u, { name: file.name, pct: 0 }]);
      try {
        const asset = await uploadAsset(file, (pct) => setUploading((u) => u.map((x) => (x.name === file.name ? { ...x, pct } : x))));
        setAssets((a) => [asset, ...(a ?? [])]);
        setUsed((n) => n + asset.size_bytes);
        if (props.mode === "pick") props.onUploaded?.(asset);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setUploading((u) => u.filter((x) => x.name !== file.name));
      }
    }
  }

  async function remove(asset: Asset) {
    if (!confirm(`¿Borrar "${asset.name}" de tu carpeta?`)) return;
    try {
      await api(`/api/assets/${asset.id}`, undefined, "DELETE");
      setAssets((a) => (a ?? []).filter((x) => x.id !== asset.id));
      setUsed((n) => n - asset.size_bytes);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const pct = Math.min(100, Math.round((used / quota) * 100));

  return (
    <div className="stack">
      <div className="row">
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="small muted" style={{ marginBottom: 6 }}>
            {formatBytes(used)} de {formatBytes(quota)} usados
          </div>
          <div className="progress">
            <div style={{ width: `${pct}%` }} />
          </div>
        </div>
        <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => upload(e.target.files)} />
        <button className="btn" onClick={() => input.current?.click()}>
          ↑ Subir {props.mode === "pick" ? "nuevo" : "recursos"}
        </button>
      </div>

      {error && <div className="alert">{error}</div>}

      {uploading.map((u) => (
        <div key={u.name} className="small muted">
          Subiendo {u.name} · {u.pct}%
        </div>
      ))}

      {assets === null ? (
        <div className="spinner" />
      ) : assets.length === 0 && uploading.length === 0 ? (
        <div className="muted small">
          Todavía no tenés recursos. Subí tu logo, capturas o fotos de reparaciones y quedan guardados para todos tus reels.
        </div>
      ) : (
        <div className="asset-grid">
          {assets.map((a) => {
            const picked = props.mode === "pick" && props.picked.includes(a.id);
            const content = (
              <>
                <div className="asset-thumb">
                  {a.url && (a.kind === "video" ? <video src={a.url} muted playsInline preload="metadata" /> : <img src={a.url} alt={a.name} />)}
                  {picked && <span className="asset-check">✓</span>}
                </div>
                <div className="small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.name}
                </div>
                <div className="muted small">{formatBytes(a.size_bytes)}</div>
              </>
            );
            return props.mode === "pick" ? (
              <button key={a.id} className={`card selectable asset-card ${picked ? "selected" : ""}`} onClick={() => props.onPick(a)}>
                {content}
              </button>
            ) : (
              <div key={a.id} className="card asset-card">
                {content}
                <button className="btn btn-ghost small" style={{ padding: "6px 10px", marginTop: 6 }} onClick={() => remove(a)}>
                  Borrar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
