"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, STATUS_CLASS, STATUS_LABEL, type JobSummary } from "@/lib/client";

type ModelOption = { id: string; name: string; description: string; durations?: number[] };

type Props = {
  kind: "image" | "video";
  title: string;
  placeholder: string;
  ideas: string[];
  models: ModelOption[];
  aspectRatios: string[];
  // Créditos por modelo: por imagen o por segundo según el tipo.
  creditTable: Record<string, Record<number, number>>;
};

export function Generator({ kind, title, placeholder, ideas, models, aspectRatios, creditTable }: Props) {
  const router = useRouter();
  const [modelId, setModelId] = useState(models[0].id);
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [amount, setAmount] = useState(kind === "image" ? 1 : models[0].durations![0]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [jobs, setJobs] = useState<JobSummary[]>([]);

  const model = models.find((m) => m.id === modelId)!;
  const amounts = kind === "image" ? [1, 2, 3, 4] : model.durations!;
  const cost = creditTable[modelId]?.[amount] ?? 0;

  useEffect(() => {
    if (!amounts.includes(amount)) setAmount(amounts[0]);
  }, [modelId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = useMemo(() => jobs.some((j) => j.status === "queued" || j.status === "processing"), [jobs]);

  async function load() {
    try {
      const { jobs } = await api<{ jobs: JobSummary[] }>(`/api/jobs?kind=${kind}`);
      setJobs(jobs);
    } catch {
      // Se reintenta en el próximo ciclo.
    }
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pending) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [pending]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    setSending(true);
    setError("");
    try {
      await api("/api/jobs", {
        kind,
        modelId,
        prompt,
        aspectRatio,
        ...(kind === "image" ? { count: amount } : { seconds: amount }),
      });
      setPrompt("");
      await load();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="stack">
      <h1>{title}</h1>

      {jobs.length === 0 && (
        <div>
          <div className="muted small" style={{ marginBottom: 8 }}>
            Ideas para arrancar · tocá una para usarla
          </div>
          <div className="grid grid-4">
            {ideas.map((idea) => (
              <button key={idea} className="card selectable small" onClick={() => setPrompt(idea)}>
                {idea}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card stack">
        <textarea placeholder={placeholder} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <div className="row">
          <select value={modelId} onChange={(e) => setModelId(e.target.value)} style={{ width: "auto" }}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} style={{ width: "auto" }}>
            {aspectRatios.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <select value={amount} onChange={(e) => setAmount(Number(e.target.value))} style={{ width: "auto" }}>
            {amounts.map((a) => (
              <option key={a} value={a}>
                {kind === "image" ? `${a} ${a === 1 ? "imagen" : "imágenes"}` : `${a} s`}
              </option>
            ))}
          </select>
          <div className="spacer" />
          <button className="btn btn-primary" disabled={prompt.trim().length < 3 || sending} onClick={submit}>
            {sending ? "Enviando…" : `Generar · ${cost} créditos`}
          </button>
        </div>
        <div className="muted small">{model.description}</div>
      </div>

      {error && <div className="alert">{error}</div>}

      {jobs.length > 0 && (
        <div className="grid grid-3 media-grid">
          {jobs.map((j) => (
            <div key={j.id} className="card stack">
              <div className="row">
                <span className={STATUS_CLASS[j.status]}>{STATUS_LABEL[j.status]}</span>
                <span className="muted small">{j.cost} créditos</span>
              </div>
              {j.status === "done" &&
                j.outputs.map((o) =>
                  o.url ? (
                    <a key={o.path} href={o.url} target="_blank" rel="noreferrer">
                      {o.type === "video" ? <video src={o.url} controls playsInline /> : <img src={o.url} alt={j.title ?? ""} />}
                    </a>
                  ) : null,
                )}
              {(j.status === "queued" || j.status === "processing") && (
                <div style={{ display: "grid", placeItems: "center", padding: 30 }}>
                  <div className="spinner" />
                </div>
              )}
              {j.status === "failed" && j.error && <div className="muted small">{j.error}</div>}
              <div className="muted small">{j.title}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
