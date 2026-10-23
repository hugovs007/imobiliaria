import { createClient } from "@/lib/supabase/server";
import type { BBConfig } from "./client";

/** Chaves usadas na tabela `configuracoes` para a integração com o BB. */
export const CHAVES_CONFIG_BB = {
  clientId: "bb_client_id",
  clientSecret: "bb_client_secret",
  convenio: "bb_convenio",
  carteira: "bb_carteira",
  variacao: "bb_variacao",
  modalidade: "bb_modalidade",
  ambiente: "bb_ambiente",
} as const;

/** Marca o momento da última sincronização de baixas (throttle de 2h). */
export const CHAVE_ULTIMA_SINCRONIZACAO = "bb_ultima_sincronizacao";

/**
 * Lê a configuração do BB na tabela `configuracoes`.
 * Retorna null se a tabela ainda não existir (migração pendente),
 * se houver erro de leitura ou se faltarem credenciais essenciais.
 */
export async function obterConfigBB(): Promise<BBConfig | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("configuracoes").select("chave, valor");
    if (error || !Array.isArray(data)) return null;

    const mapa = new Map(data.map((r) => [String(r.chave), String(r.valor ?? "")]));

    const clientId = (mapa.get(CHAVES_CONFIG_BB.clientId) || "").trim();
    const clientSecret = (mapa.get(CHAVES_CONFIG_BB.clientSecret) || "").trim();
    const convenio = (mapa.get(CHAVES_CONFIG_BB.convenio) || "").trim();
    if (!clientId || !clientSecret || !convenio) return null;

    return {
      clientId,
      clientSecret,
      convenio,
      carteira: (mapa.get(CHAVES_CONFIG_BB.carteira) || "17").trim(),
      variacao: (mapa.get(CHAVES_CONFIG_BB.variacao) || "019").trim(),
      modalidade: (mapa.get(CHAVES_CONFIG_BB.modalidade) || "1").trim(),
      ambiente: mapa.get(CHAVES_CONFIG_BB.ambiente) === "producao" ? "producao" : "sandbox",
    };
  } catch {
    return null;
  }
}
