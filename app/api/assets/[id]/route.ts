import { NextResponse } from "next/server";
import { handle, HttpError, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

export function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const admin = createAdminClient();
    const { data: asset } = await admin.from("assets").select("id, path, user_id").eq("id", id).maybeSingle();
    if (!asset || asset.user_id !== user.id) throw new HttpError("No encontramos ese recurso.", 404);

    await admin.storage.from("uploads").remove([asset.path]);
    await admin.from("assets").delete().eq("id", asset.id);
    return NextResponse.json({ ok: true });
  });
}
