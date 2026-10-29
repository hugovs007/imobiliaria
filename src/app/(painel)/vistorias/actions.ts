"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CHECKLIST_PADRAO } from "./checklist-template";

export async function criarVistoria(formData: FormData): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();

    const imovelId = String(formData.get("imovel_id") ?? "");
    if (!imovelId) {
      return { error: "Selecione o imóvel da vistoria." };
    }

    const contratoRaw = String(formData.get("contrato_id") ?? "");
    const contratoId = contratoRaw && contratoRaw.trim() !== "" ? contratoRaw : null;

    const payload = {
      imovel_id: imovelId,
      contrato_id: contratoId,
      tipo: String(formData.get("tipo") ?? "") || "entrada",
      data_vistoria:
        String(formData.get("data_vistoria") ?? "") || new Date().toISOString().slice(0, 10),
      vistoriador: String(formData.get("vistoriador") ?? "") || null,
      observacoes_gerais: String(formData.get("observacoes_gerais") ?? "") || null,
    };

    const { data: vistoria, error } = await supabase
      .from("vistorias")
      .insert([payload])
      .select("id")
      .single();

    if (error || !vistoria) {
      console.error("Erro ao criar vistoria:", error?.message);
      return { error: error?.message ?? "Não foi possível criar a vistoria." };
    }

    // Insere o checklist padrão — o estado inicial usa o padrão do banco ("bom").
    const itens = CHECKLIST_PADRAO.flatMap((grupo) =>
      grupo.itens.map((item) => ({
        vistoria_id: vistoria.id,
        comodo: grupo.comodo,
        item,
      }))
    );

    const { error: erroItens } = await supabase.from("vistoria_itens").insert(itens);
    if (erroItens) {
      console.warn("Falha ao inserir checklist padrão:", erroItens.message);
    }

    revalidatePath("/vistorias");
    return { error: null };
  } catch (err) {
    console.error("Erro na action criarVistoria:", err);
    return {
      error: err instanceof Error ? err.message : "Não foi possível criar a vistoria.",
    };
  }
}

export async function adicionarItemVistoria(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();

    const vistoriaId = String(formData.get("vistoria_id") ?? "");
    const comodo = String(formData.get("comodo") ?? "").trim();
    const item = String(formData.get("item") ?? "").trim();

    if (!vistoriaId || !comodo || !item) {
      console.error("Informe o cômodo e o item.");
      return;
    }

    const estado = String(formData.get("estado") ?? "") || "bom";
    const observacao = String(formData.get("observacao") ?? "") || null;

    const { error } = await supabase
      .from("vistoria_itens")
      .insert([{ vistoria_id: vistoriaId, comodo, item, estado, observacao }]);

    if (error) {
      console.error("Erro ao adicionar item da vistoria:", error.message);
      return;
    }

    revalidatePath(`/vistorias/${vistoriaId}`);
  } catch (err) {
    console.error("Erro na action adicionarItemVistoria:", err);
  }
}

export async function atualizarItemVistoria(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();

    const id = String(formData.get("id") ?? "");
    const vistoriaId = String(formData.get("vistoria_id") ?? "");
    const estado = String(formData.get("estado") ?? "");
    const observacao = String(formData.get("observacao") ?? "") || null;

    if (!id || !estado) {
      console.error("Estado do item não informado.");
      return;
    }

    const { error } = await supabase
      .from("vistoria_itens")
      .update({ estado, observacao })
      .eq("id", id);

    if (error) {
      console.error("Erro ao atualizar item da vistoria:", error.message);
      return;
    }

    revalidatePath(`/vistorias/${vistoriaId}`);
  } catch (err) {
    console.error("Erro na action atualizarItemVistoria:", err);
  }
}

export async function excluirItemVistoria(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();

    const id = String(formData.get("id") ?? "");
    const vistoriaId = String(formData.get("vistoria_id") ?? "");

    if (!id) {
      console.error("Item não informado.");
      return;
    }

    const { error } = await supabase.from("vistoria_itens").delete().eq("id", id);

    if (error) {
      console.error("Erro ao excluir item da vistoria:", error.message);
      return;
    }

    revalidatePath(`/vistorias/${vistoriaId}`);
  } catch (err) {
    console.error("Erro na action excluirItemVistoria:", err);
  }
}

export async function adicionarFotoVistoria(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();

    const vistoriaId = String(formData.get("vistoria_id") ?? "");
    const url = String(formData.get("url") ?? "").trim();

    if (!vistoriaId || !url) {
      console.error("Informe a URL da foto.");
      return;
    }

    const descricao = String(formData.get("descricao") ?? "") || null;

    const { error } = await supabase
      .from("vistoria_fotos")
      .insert([{ vistoria_id: vistoriaId, url, descricao }]);

    if (error) {
      console.error("Erro ao adicionar foto da vistoria:", error.message);
      return;
    }

    revalidatePath(`/vistorias/${vistoriaId}`);
  } catch (err) {
    console.error("Erro na action adicionarFotoVistoria:", err);
  }
}

export async function excluirFotoVistoria(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();

    const id = String(formData.get("id") ?? "");
    const vistoriaId = String(formData.get("vistoria_id") ?? "");

    if (!id) {
      console.error("Foto não informada.");
      return;
    }

    const { error } = await supabase.from("vistoria_fotos").delete().eq("id", id);

    if (error) {
      console.error("Erro ao excluir foto da vistoria:", error.message);
      return;
    }

    revalidatePath(`/vistorias/${vistoriaId}`);
  } catch (err) {
    console.error("Erro na action excluirFotoVistoria:", err);
  }
}

export async function excluirVistoria(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();

    const id = String(formData.get("id") ?? "");
    if (!id) {
      console.error("Vistoria não informada.");
      return;
    }

    // Itens e fotos são removidos automaticamente (ON DELETE CASCADE).
    const { error } = await supabase.from("vistorias").delete().eq("id", id);

    if (error) {
      console.error("Erro ao excluir vistoria:", error.message);
      return;
    }

    revalidatePath("/vistorias");
  } catch (err) {
    console.error("Erro na action excluirVistoria:", err);
  }
}
