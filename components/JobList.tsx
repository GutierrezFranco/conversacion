"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, STATUS_CLASS, STATUS_LABEL, type JobSummary } from "@/lib/client";

// Lista de trabajos que se actualiza sola mientras haya alguno en curso.
export function JobList({ kind, title, hrefPrefix }: { kind: JobSummary["kind"]; title: string; hrefPrefix?: string }) {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const { jobs } = await api<{ jobs: JobSummary[] }>(`/api/jobs?kind=${kind}`);
        if (!alive) return;
        setJobs(jobs);
        if (jobs.some((j) => j.status === "queued" || j.status === "processing")) timer = setTimeout(load, 5000);
      } catch {
        if (alive) timer = setTimeout(load, 10000);
      }
    }
    load();
    window.addEventListener("jobs:changed", load);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener("jobs:changed", load);
    };
  }, [kind]);

  if (!jobs || jobs.length === 0) return null;

  return (
    <section style={{ marginTop: 40 }}>
      <h2>{title}</h2>
      <div className="grid grid-4">
        {jobs.map((j) => {
          const content = (
            <>
              <span className={STATUS_CLASS[j.status]}>{STATUS_LABEL[j.status]}</span>
              <div style={{ fontWeight: 700, marginTop: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {j.title ?? "Sin título"}
              </div>
              <div className="muted small">
                {new Date(j.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })} · {j.cost} créditos
              </div>
            </>
          );
          return hrefPrefix ? (
            <Link key={j.id} href={`${hrefPrefix}${j.id}`} className="card selectable" style={{ textDecoration: "none" }}>
              {content}
            </Link>
          ) : (
            <div key={j.id} className="card">
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
