"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

type EditableFieldKind = "text" | "nullableText" | "number" | "date" | "month";

const editableFields: Record<string, { path: string; fields: Record<string, EditableFieldKind> }> = {
  proprietarios: {
    path: "/proprietarios",
    fields: { nome: "text", cpf_cnpj: "text", telefone: "text", email: "nullableText", observacoes: "nullableText" },
  },
  inquilinos: {
    path: "/inquilinos",
    fields: { nome: "text", cpf_cnpj: "text", telefone: "text", email: "nullableText", observacoes: "nullableText" },
  },
  imoveis: {
    path: "/imoveis",
    fields: {
      codigo: "text", proprietario_id: "nullableText", tipo: "text", finalidade: "text", status: "text",
      cep: "nullableText", logradouro: "text", numero: "nullableText", complemento: "nullableText", bairro: "nullableText",
      cidade: "text", uf: "text", area_total: "number", area_util: "number", valor_aluguel: "number",
      valor_condominio: "number", iptu_mensal: "number", matricula: "nullableText", matricula_agua: "nullableText",
      matricula_luz: "nullableText", observacoes: "nullableText",
    },
  },
  contratos: {
    path: "/contratos",
    fields: {
      data_inicio: "date", data_fim: "date", dia_vencimento: "number", valor_aluguel: "number",
      indice_reajuste: "text", fiador_1_nome: "text", fiador_1_cpf: "text", fiador_1_estado_civil: "nullableText",
      fiador_1_profissao: "nullableText", fiador_1_endereco: "text", fiador_1_telefone: "nullableText",
      fiador_2_nome: "nullableText", fiador_2_cpf: "nullableText", fiador_2_estado_civil: "nullableText",
      fiador_2_profissao: "nullableText", fiador_2_endereco: "nullableText", fiador_2_telefone: "nullableText",
    },
  },
  contas_consumo: {
    path: "/contas",
    fields: {
      imovel_id: "text", tipo: "text", competencia: "text", valor: "number",
      responsavel: "text", paga: "text",
    },
  },
  manutencoes: {
    path: "/manutencoes",
    fields: {
      imovel_id: "text", tipo: "text", descricao: "text", status: "text", custo: "number",
      responsavel: "nullableText", data_solicitacao: "date", data_conclusao: "date", observacoes: "nullableText",
    },
  },
  indices_economicos: {
    path: "/indices",
    fields: { indice: "text", mes_referencia: "text", variacao_12m: "number", fonte: "nullableText" },
  },
  arquivos: {
    path: "/arquivos",
    fields: { nome: "text", entidade_tipo: "text", entidade_id: "text", tipo_arquivo: "nullableText" },
  },
  profiles: {
    path: "/equipe",
    fields: { nome: "text" },
  },
};

export async function atualizarRegistro(formData: FormData) {
  const entity = String(formData.get("entity") || "");
  const id = String(formData.get("id") || "");
  const config = editableFields[entity];

  if (!config || !id) throw new Error("Registro inválido.");

  const values: Record<string, string | number | null> = {};
  for (const [field, kind] of Object.entries(config.fields)) {
    const rawValue = formData.get(field);
    if (rawValue === null) continue;
    const value = String(rawValue);

    if (kind === "number") values[field] = value === "" ? null : Number(value);
    else if (kind === "date") values[field] = value || null;
    else if (kind === "month") values[field] = value ? `${value}-01` : null;
    else if (kind === "nullableText") values[field] = value || null;
    else values[field] = value;
  }

  const supabase = await createClient();
  const { error } = await supabase.from(entity).update(values).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(config.path);
}
