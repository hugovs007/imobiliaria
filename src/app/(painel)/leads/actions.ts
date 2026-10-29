"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function criarLead(formData: FormData): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();

    const nome = String(formData.get("nome") ?? "").trim();
    const telefone = String(formData.get("telefone") ?? "").trim();

    if (!nome || !telefone) {
      return { error: "Informe o nome e o telefone do lead." };
    }

    const email = String(formData.get("email") ?? "").trim() || null;
    const imovelId = String(formData.get("imovel_id") ?? "") || null;
    const origem = String(formData.get("origem") ?? "").trim() || null;
    const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

    const payload = {
      nome,
      telefone,
      email,
      imovel_id: imovelId,
      origem,
      observacoes,
    };

    const { error } = await supabase.from("leads").insert([payload]);

    if (error) {
      console.error("Erro ao criar lead:", error.message);
      return { error: error.message };
    }

    revalidatePath("/leads");
    return { error: null };
  } catch (err) {
    console.error("Erro na action criarLead:", err);
    return {
      error: err instanceof Error ? err.message : "Não foi possível criar o lead.",
    };
  }
}

export async function atualizarStatusLead(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();

    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "");

    if (!id || !status) {
      console.error("Dados incompletos para atualizar o lead.");
      return;
    }

    const { error } = await supabase.from("leads").update({ status }).eq("id", id);

    if (error) {
      console.error("Erro ao atualizar lead:", error.message);
      return;
    }

    revalidatePath("/leads");
  } catch (err) {
    console.error("Erro na action atualizarStatusLead:", err);
  }
}

export async function excluirLead(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();

    const id = String(formData.get("id") ?? "");
    if (!id) {
      console.error("ID do lead não informado.");
      return;
    }

    const { error } = await supabase.from("leads").delete().eq("id", id);

    if (error) {
      console.error("Erro ao excluir lead:", error.message);
      return;
    }

    revalidatePath("/leads");
  } catch (err) {
    console.error("Erro na action excluirLead:", err);
  }
}
