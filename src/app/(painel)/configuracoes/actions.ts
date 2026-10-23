"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { invalidarTokenBB, obterTokenBB } from "@/lib/bb/client";
import { CHAVES_CONFIG_BB, obterConfigBB } from "@/lib/bb/config";

export type ResultadoConfig = { ok: boolean; message: string };

export async function salvarConfigBB(
  _prev: ResultadoConfig,
  formData: FormData
): Promise<ResultadoConfig> {
  try {
    const supabase = await createClient();
    const agora = new Date().toISOString();

    const pares: Array<{ chave: string; valor: string }> = [
      { chave: CHAVES_CONFIG_BB.ambiente, valor: String(formData.get("ambiente") || "sandbox") },
      { chave: CHAVES_CONFIG_BB.clientId, valor: String(formData.get("client_id") || "").trim() },
      { chave: CHAVES_CONFIG_BB.convenio, valor: String(formData.get("convenio") || "").trim() },
      { chave: CHAVES_CONFIG_BB.carteira, valor: String(formData.get("carteira") || "").trim() },
      { chave: CHAVES_CONFIG_BB.variacao, valor: String(formData.get("variacao") || "").trim() },
      { chave: CHAVES_CONFIG_BB.modalidade, valor: String(formData.get("modalidade") || "").trim() },
    ];

    // Secret só é sobrescrito quando preenchido (campo vem mascarado na edição).
    const secret = String(formData.get("client_secret") || "").trim();
    if (secret) pares.push({ chave: CHAVES_CONFIG_BB.clientSecret, valor: secret });

    const { error } = await supabase
      .from("configuracoes")
      .upsert(pares.map((p) => ({ ...p, updated_at: agora })), { onConflict: "chave" });

    if (error) return { ok: false, message: `Erro ao salvar: ${error.message}` };

    invalidarTokenBB();
    revalidatePath("/configuracoes");
    revalidatePath("/pagamentos");
    return { ok: true, message: "Configuração salva." };
  } catch (err: any) {
    console.error("Erro em salvarConfigBB:", err);
    return { ok: false, message: err?.message || "Erro inesperado ao salvar." };
  }
}

export async function testarConexaoBB(
  _prev: ResultadoConfig,
  _formData: FormData
): Promise<ResultadoConfig> {
  try {
    const config = await obterConfigBB();
    if (!config) {
      return {
        ok: false,
        message: "Configuração incompleta — salve Client ID, Client Secret e convênio antes de testar.",
      };
    }

    await obterTokenBB(config);
    return {
      ok: true,
      message: `Conexão OK (${config.ambiente === "producao" ? "produção" : "homologação/sandbox"}).`,
    };
  } catch (err: any) {
    console.error("Erro em testarConexaoBB:", err);
    return { ok: false, message: err?.message || "Falha ao conectar ao BB." };
  }
}
