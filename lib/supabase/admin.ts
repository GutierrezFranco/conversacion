import { createClient } from "@supabase/supabase-js";
import { env } from "../env";

// Cliente con la service role key: saltea RLS. Usalo solo en el servidor y en el worker.
export function createAdminClient() {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
