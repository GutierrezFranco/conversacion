import { NextResponse } from "next/server";
import { handle, HttpError, requireUser, signPaths } from "@/lib/api";
import { FREE_FIXES_PER_EDIT, iterationJob, jobInput, ownsPath, resolveJob, type ResolvedJob } from "@/lib/jobs";
import { REFERENCES_PER_DAY } from "@/lib/storage-rules";
import type { EditStyle } from "@/lib/styles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export function GET(request: Request) {
  return handle(async () => {
    await requireUser();
    const kind = new URL(request.url).searchParams.get("kind");
    const supabase = await createClient();
    let query = supabase
      .from("jobs")
      .select("id, kind, status, title, cost, parent_job_id, error, result, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (kind) query = query.eq("kind", kind);
    const { data, error } = await query;
    if (error) throw error;

    // Firmamos las URLs de los resultados para poder mostrarlos en la galería.
    type Output = { path: string; type: "video" | "image" };
    const outputsOf = (r: unknown) => ((r as { outputs?: Output[] } | null)?.outputs ?? []);
    const signed = await signPaths("outputs", data.flatMap((j) => outputsOf(j.result).map((o) => o.path)));
    const jobs = data.map(({ result, ...j }) => ({
      ...j,
      outputs: outputsOf(result).map((o) => ({ ...o, url: signed[o.path] ?? null })),
    }));
    return NextResponse.json({ jobs });
  });
}

export function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const parsed = jobInput.safeParse(await request.json());
    if (!parsed.success) throw new HttpError("Revisá los datos del pedido.", 400);
    const input = parsed.data;
    const admin = createAdminClient();

    let job: ResolvedJob;
    if (input.kind === "iterate") {
      const { data: parent } = await admin
        .from("jobs")
        .select("id, user_id, kind, status, title, params")
        .eq("id", input.parentJobId)
        .maybeSingle();
      if (!parent || parent.user_id !== user.id || parent.kind !== "edit") throw new HttpError("No encontramos esa edición.", 404);
      if (parent.status !== "done") throw new HttpError("Esperá a que termine la edición antes de pedir cambios.", 409);
      job = iterationJob(parent, input.changes, input.mode);
      if (input.mode === "fix") {
        const { count } = await admin
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("cost", 0)
          .eq("params->>rootJobId", job.params.rootJobId as string);
        if ((count ?? 0) >= FREE_FIXES_PER_EDIT) {
          throw new HttpError("Ya rehicimos gratis esta edición. Si querés otro ajuste, pedilo como cambio.", 409);
        }
      }
    } else {
      let customStyle: EditStyle | undefined;
      if (input.kind === "edit") {
        const ok =
          ownsPath(user.id, input.rawPath, "raw") &&
          input.resources.every((r) => ownsPath(user.id, r.path, "assets")) &&
          (!input.music || ownsPath(user.id, input.music.path, "assets"));
        if (!ok) throw new HttpError("Archivo inválido.", 403);
        if (input.styleId.startsWith("custom:")) {
          const { data } = await admin
            .from("custom_styles")
            .select("style")
            .eq("id", input.styleId.slice("custom:".length))
            .eq("user_id", user.id)
            .maybeSingle();
          customStyle = (data?.style as EditStyle | undefined) ?? undefined;
        }
      }
      if (input.kind === "reference") {
        if (!ownsPath(user.id, input.path, "refs")) throw new HttpError("Archivo inválido.", 403);
        // El análisis es gratis, así que lo limitamos para que no se abuse.
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await admin
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("kind", "reference")
          .gte("created_at", since);
        if ((count ?? 0) >= REFERENCES_PER_DAY) throw new HttpError(`Podés analizar hasta ${REFERENCES_PER_DAY} referencias por día.`, 429);
      }
      try {
        job = resolveJob(input, customStyle);
      } catch (err) {
        throw new HttpError((err as Error).message, 400);
      }
    }

    const { data, error } = await admin.rpc("create_job", {
      p_user_id: user.id,
      p_kind: job.kind,
      p_title: job.title,
      p_params: job.params,
      p_cost: job.cost,
      p_parent_job_id: job.parentJobId ?? null,
    });
    if (error) {
      if (error.message.includes("INSUFFICIENT_CREDITS")) {
        throw new HttpError(`Te faltan créditos: este pedido cuesta ${job.cost}.`, 402);
      }
      throw error;
    }
    return NextResponse.json({ job: data });
  });
}
