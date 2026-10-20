import { NextResponse } from "next/server";
import { handle, HttpError, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

export function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const admin = createAdminClient();
    const { data } = await admin.from("custom_styles").delete().eq("id", id).eq("user_id", user.id).select("id");
    if (!data?.length) throw new HttpError("No encontramos ese estilo.", 404);
    return NextResponse.json({ ok: true });
  });
}
