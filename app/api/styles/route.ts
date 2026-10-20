import { NextResponse } from "next/server";
import { handle, requireUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

// Estilos propios del usuario, sacados de sus referencias.
export function GET() {
  return handle(async () => {
    await requireUser();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("custom_styles")
      .select("id, name, style, copied, analysis, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    // Un estilo sin "style.id" todavía se está guardando: no lo mostramos.
    return NextResponse.json({ styles: data.filter((s) => (s.style as { id?: string })?.id) });
  });
}
