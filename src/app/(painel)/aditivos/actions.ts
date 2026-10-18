"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function criarAditivo(formData: FormData): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();

    const contratoId = String(formData.get("contrato_id") ?? "");
    if (!contratoId) {
      return { error: "Selecione o contrato do aditivo." };
    }

    const descricao = String(formData.get("descricao") ?? "").trim();
    if (!descricao) {
      return { error: "Informe a descrição do aditivo." };
    }

    const tipo = String(formData.get("tipo") ?? "") || "outro";
    const dataAssinatura =
      String(formData.get("data_assinatura") ?? "") || new Date().toISOString().slice(0, 10);

    const valorAnteriorRaw = String(formData.get("valor_anterior") ?? "").trim();
    const valorNovoRaw = String(formData.get("valor_novo") ?? "").trim();
    const novaDataFim = String(formData.get("nova_data_fim") ?? "") || null;
    const documentoUrl = String(formData.get("documento_url") ?? "").trim() || null;
    const aplicarNovoValor = formData.get("aplicar_novo_valor") !== null;

    const valorAnterior = valorAnteriorRaw ? parseFloat(valorAnteriorRaw.replace(",", ".")) : null;
    const valorNovo = valorNovoRaw ? parseFloat(valorNovoRaw.replace(",", ".")) : null;

    if (valorAnterior !== null && Number.isNaN(valorAnterior)) {
      return { error: "Valor anterior inválido." };
    }
    if (valorNovo !== null && Number.isNaN(valorNovo)) {
      return { error: "Novo valor inválido." };
    }

    const payload = {
      contrato_id: contratoId,
      tipo,
      descricao,
      data_assinatura: dataAssinatura,
      valor_anterior: valorAnterior,
      valor_novo: valorNovo,
      nova_data_fim: novaDataFim,
      documento_url: documentoUrl,
    };

    const { error } = await supabase.from("aditivos").insert([payload]);

    if (error) {
      console.error("Erro ao criar aditivo:", error.message);
      return { error: error.message };
    }

    // Opcional: aplica o novo valor diretamente ao contrato.
    if (aplicarNovoValor && valorNovo !== null) {
      const { error: erroContrato } = await supabase
        .from("contratos")
        .update({ valor_atual: valorNovo })
        .eq("id", contratoId);

      if (erroContrato) {
        console.warn("Aditivo criado, mas falha ao atualizar valor do contrato:", erroContrato.message);
      } else {
        revalidatePath("/contratos");
      }
    }

    revalidatePath("/aditivos");
    return { error: null };
  } catch (err) {
    console.error("Erro na action criarAditivo:", err);
    return {
      error: err instanceof Error ? err.message : "Não foi possível criar o aditivo.",
    };
  }
}

export async function excluirAditivo(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();

    const id = String(formData.get("id") ?? "");
    if (!id) {
      console.error("Aditivo não informado.");
      return;
    }

    const { error } = await supabase.from("aditivos").delete().eq("id", id);

    if (error) {
      console.error("Erro ao excluir aditivo:", error.message);
      return;
    }

    revalidatePath("/aditivos");
  } catch (err) {
    console.error("Erro na action excluirAditivo:", err);
  }
}
