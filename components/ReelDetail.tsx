"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, STATUS_CLASS, STATUS_LABEL, type JobSummary } from "@/lib/client";

type JobDetail = JobSummary & {
  params: { styleId?: string; changes?: string };
  result: { summary?: string; duration?: number } | null;
  rawUrl: string | null;
};

export function ReelDetail({
  id,
  iterationCost,
  iterationPrice,
  styleNames,
}: {
  id: string;
  iterationCost: number;
  iterationPrice: string;
  styleNames: Record<string, string>;
}) {
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [changes, setChanges] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const { job } = await api<{ job: JobDetail }>(`/api/jobs/${id}`);
        if (!alive) return;
        setJob(job);
        if (job.status === "queued" || job.status === "processing") timer = setTimeout(load, 4000);
        else router.refresh(); // actualiza el saldo si hubo devolución
      } catch {
        if (alive) setNotFound(true);
      }
    }
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id, router]);

  async function iterate() {
    setSending(true);
    setError("");
    try {
      const { job: next } = await api<{ job: { id: string } }>("/api/jobs", { kind: "iterate", parentJobId: id, changes });
      router.push(`/app/reel/${next.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSending(false);
    }
  }

  if (notFound) return <div className="alert">No encontramos este reel.</div>;
  if (!job) return <div className="spinner" />;

  const edited = job.outputs.find((o) => o.type === "video");
  const working = job.status === "queued" || job.status === "processing";

  return (
    <div className="stack">
      <div className="row">
        <Link href="/app" className="btn btn-ghost">
          ← Volver
        </Link>
        <h1 style={{ margin: 0 }}>{job.title}</h1>
        <span className={STATUS_CLASS[job.status]}>{STATUS_LABEL[job.status]}</span>
        {job.params.styleId && <span className="pill">Estilo {styleNames[job.params.styleId] ?? job.params.styleId}</span>}
      </div>

      <div className="row" style={{ alignItems: "flex-start", gap: 24 }}>
        <div style={{ flex: "1 1 260px", maxWidth: 320 }}>
          <div className="muted small" style={{ marginBottom: 8 }}>
            TU CRUDO
          </div>
          <div className="phone">{job.rawUrl ? <video src={job.rawUrl} controls playsInline /> : <div className="spinner" />}</div>
        </div>
        <div style={{ flex: "1 1 260px", maxWidth: 320 }}>
          <div className="muted small" style={{ marginBottom: 8 }}>
            TU VIDEO EDITADO
          </div>
          <div className="phone" style={edited ? { borderColor: "var(--accent)" } : undefined}>
            {edited?.url ? (
              <video src={edited.url} controls playsInline />
            ) : working ? (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div className="spinner" style={{ margin: "0 auto 12px" }} />
                <div className="small">Estamos editando tu reel</div>
                <div className="muted small">Suele tardar entre 2 y 6 minutos. Podés cerrar esta página.</div>
              </div>
            ) : (
              <div className="muted small" style={{ padding: 20, textAlign: "center" }}>
                {job.error ?? "No se pudo editar."}
                <br />
                Te devolvimos los créditos.
              </div>
            )}
          </div>
        </div>

        <div className="stack" style={{ flex: "2 1 300px" }}>
          {job.params.changes && (
            <div className="card">
              <div className="muted small">Cambios pedidos</div>
              {job.params.changes}
            </div>
          )}
          {job.result?.summary && (
            <div className="card">
              <div className="muted small">Qué hicimos</div>
              {job.result.summary}
            </div>
          )}
          {edited?.url && (
            <a className="btn btn-primary" href={edited.url} download>
              Descargar reel
            </a>
          )}
          {job.status === "done" && (
            <div className="card stack">
              <div>
                <b>¿Querés cambiar algo?</b>
                <div className="muted small">Contanos qué ajustar y lo volvemos a editar por {iterationCost} créditos ({iterationPrice}).</div>
              </div>
              <textarea
                placeholder="Ej: el principio está muy cortado, dejá la primera frase entera. Mostrá el logo al final."
                value={changes}
                onChange={(e) => setChanges(e.target.value)}
              />
              {error && <div className="alert">{error}</div>}
              <button className="btn" disabled={changes.trim().length < 3 || sending} onClick={iterate}>
                {sending ? "Enviando…" : `Pedir cambios · ${iterationPrice}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
