import { NextResponse } from "next/server";
import { getUser } from "./supabase/server";
import { signedReadUrls, type Bucket } from "./files";
import { createAdminClient } from "./supabase/admin";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUser() {
  const user = await getUser();
  if (!user) throw new HttpError("Tenés que iniciar sesión.", 401);
  return user;
}

export class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((err: unknown) => {
    if (err instanceof HttpError) return jsonError(err.message, err.status);
    console.error(err);
    return jsonError("Algo salió mal. Probá de nuevo en un rato.", 500);
  });
}

export async function getBalance(userId: string): Promise<number> {
  const { data } = await createAdminClient().from("credit_balances").select("balance").eq("user_id", userId).maybeSingle();
  return data?.balance ?? 0;
}

// Firma URLs de lectura para los archivos guardados en Storage (válidas por 1 hora).
export function signPaths(bucket: Bucket, paths: string[]): Promise<Record<string, string>> {
  return signedReadUrls(bucket, paths, 3600);
}
