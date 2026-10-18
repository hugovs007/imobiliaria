import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Autenticação do Portal do Inquilino.
 *
 * O inquilino NÃO é um usuário Supabase auth — ele entra com CPF + código
 * do contrato. A sessão é um cookie HTTP-only assinado com HMAC-SHA256
 * contendo o id do contrato. Todas as consultas do portal usam um client
 * com SERVICE ROLE (bypassa o RLS) filtrando SEMPRE pelo contrato da sessão.
 */

export const PORTAL_COOKIE = "portal_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

function portalSecret(): string {
  return (
    process.env.PORTAL_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "portal-dev-secret"
  );
}

/** Gera o token de sessão: `contratoId.expiraEm.assinatura` */
export function assinarSessaoPortal(contratoId: string): string {
  const expiraEm = Date.now() + SESSION_TTL_MS;
  const payload = `${contratoId}.${expiraEm}`;
  const assinatura = createHmac("sha256", portalSecret()).update(payload).digest("hex");
  return `${payload}.${assinatura}`;
}

/** Valida o token e retorna o contratoId, ou null se inválido/expirado. */
export function verificarSessaoPortal(token: string | null | undefined): string | null {
  if (!token) return null;
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [contratoId, expiraEm, assinatura] = partes;

  const esperada = createHmac("sha256", portalSecret()).update(`${contratoId}.${expiraEm}`).digest("hex");
  const a = Buffer.from(assinatura, "hex");
  const b = Buffer.from(esperada, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(expiraEm) < Date.now()) return null;

  return contratoId;
}

/** Lê o cookie de sessão do portal e retorna o contratoId (ou null). */
export async function getSessaoPortal(): Promise<string | null> {
  const cookieStore = await cookies();
  return verificarSessaoPortal(cookieStore.get(PORTAL_COOKIE)?.value);
}

/** Verifica se a service role key está configurada (necessária para o portal). */
export function portalConfigurado(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Client Supabase com service role — bypassa o RLS.
 * USAR APENAS no servidor (server components / server actions / route handlers)
 * e SEMPRE filtrando pelo contrato da sessão.
 */
export async function createPortalClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Portal não configurado: adicione SUPABASE_SERVICE_ROLE_KEY ao .env.local (Settings → API → service_role key)."
    );
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Remove pontuação de CPF/CNPj para comparação. */
export function normalizarDocumento(valor: string): string {
  return String(valor || "").replace(/\D/g, "");
}
