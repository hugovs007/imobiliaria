"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function criarConta(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const imovelId = String(formData.get("imovel_id") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "agua");
  const competenciaBruta = String(formData.get("competencia") ?? "").trim();
  const valorTexto = String(formData.get("valor") ?? "").trim().replace(",", ".");
  const valor = Number(valorTexto);
  const responsavel = String(formData.get("responsavel") || "proprietario");

  if (!imovelId) {
    return { error: "Selecione um imóvel." };
  }

  // A coluna competencia é varchar(7): o valor deve ser "YYYY-MM".
  // Aceita também "YYYY-MM-DD" (fallback de navegador sem input month) e trunca para 7 caracteres.
  const competencia = competenciaBruta.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(competencia)) {
    return { error: "Informe a competência no formato mês/ano (ex.: 2026-10)." };
  }

  if (!valorTexto || !Number.isFinite(valor) || valor < 0) {
    return { error: "Informe um valor válido." };
  }

  try {
    const { error } = await supabase.from("contas_consumo").insert({
      imovel_id: imovelId,
      tipo,
      competencia,
      valor,
      responsavel,
    });

    if (error) {
      console.error("Erro ao cadastrar conta:", error.message);
      return { error: error.message };
    }

    revalidatePath("/contas");
    return { error: null };
  } catch (err) {
    console.error("Exceção ao cadastrar conta:", err);
    return { error: err instanceof Error ? err.message : "Não foi possível cadastrar a conta." };
  }
}

export async function marcarContaPaga(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  try {
    const { error } = await supabase.from("contas_consumo").update({ paga: true }).eq("id", id);
    if (error) {
      console.error("Erro ao marcar conta como paga:", error.message);
      return;
    }
    revalidatePath("/contas");
  } catch (err) {
    console.error("Exceção ao marcar conta como paga:", err);
  }
}
