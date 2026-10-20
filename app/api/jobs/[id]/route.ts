import { NextResponse } from "next/server";
import { handle, HttpError, requireUser, signPaths } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

type Outputs = { outputs?: { path: string; type: "video" | "image" }[] };

export function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireUser();
    const { id } = await ctx.params;
    const supabase = await createClient();
    const { data: job } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
    if (!job) throw new HttpError("No encontramos ese trabajo.", 404);

    const result = (job.result ?? {}) as Outputs;
    const outputPaths = (result.outputs ?? []).map((o) => o.path);
    const signedOutputs = await signPaths("outputs", outputPaths);
    const rawPath = typeof job.params?.rawPath === "string" ? job.params.rawPath : null;
    const signedRaw = rawPath ? await signPaths("uploads", [rawPath]) : {};

    return NextResponse.json({
      job: {
        ...job,
        outputs: (result.outputs ?? []).map((o) => ({ ...o, url: signedOutputs[o.path] ?? null })),
        rawUrl: rawPath ? signedRaw[rawPath] ?? null : null,
      },
    });
  });
}
