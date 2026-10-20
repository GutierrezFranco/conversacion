import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Vuelta del link mágico / Google: cambia el código por una sesión.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/app";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
    console.error("auth callback: no se pudo cambiar el código", error.message);
  } else {
    // Supabase vuelve sin código cuando falla el proveedor (por ejemplo, Google mal configurado).
    console.error("auth callback: volvió sin código", url.searchParams.get("error_description") ?? url.searchParams.get("error"));
  }
  return NextResponse.redirect(new URL("/login?error=1", url.origin));
}
