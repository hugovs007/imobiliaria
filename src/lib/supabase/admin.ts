import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase com service role — bypassa o RLS.
 * USAR APENAS no servidor, para operações de super administrador
 * (criar empresas, criar usuários via auth.admin, vincular perfis).
 */
export async function createAdminClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Admin não configurado: adicione SUPABASE_SERVICE_ROLE_KEY ao .env.local (Settings → API → service_role key)."
    );
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
