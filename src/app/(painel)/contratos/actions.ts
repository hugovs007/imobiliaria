"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createTenantFolderStructure } from "@/lib/google-drive-folders";
import { calcularDataFimContratual } from "@/lib/codigo-contrato";

export type ActionState = {
  success?: boolean;
  error?: string | null;
};

export async function criarContrato(_prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();

    const imovel_id = String(formData.get("imovel_id") || "").trim();
    const inquilino_id = String(formData.get("inquilino_id") || "").trim();

    if (!imovel_id || !inquilino_id) {
      return { success: false, error: "Selecione um imóvel e um inquilino válidos." };
    }

    const dataInicio = String(formData.get("data_inicio") || "").trim();
    if (!dataInicio) {
      return { success: false, error: "Informe a data de início do contrato." };
    }

    // 1. Mapeamento do Enum reajuste_indice
    const rawIndice = String(formData.get("indice_reajuste") || "IGP-M").toUpperCase();
    let indice_reajuste: "IGP-M" | "IPCA" | "Outro" = "IGP-M";
    if (rawIndice.includes("IPCA")) indice_reajuste = "IPCA";
    else if (rawIndice.includes("OUTRO")) indice_reajuste = "Outro";

    // 2. Sanitização do valor do aluguel (valor_aluguel no schema)
    const valorRaw = formData.get("valor_aluguel") || formData.get("valor_atual") || formData.get("valor_aluguel_atual");
    const valor_aluguel = parseFloat(String(valorRaw || "0")) || 0;

    if (valor_aluguel <= 0) {
      return { success: false, error: "Informe um valor de aluguel válido." };
    }

    // 3. Validação do dia de vencimento (conforme restrição check: 1 a 31)
    const diaVencimentoParsed = parseInt(String(formData.get("dia_vencimento") || "10"), 10);
    const dia_vencimento = isNaN(diaVencimentoParsed) ? 10 : Math.min(Math.max(diaVencimentoParsed, 1), 31);

    // 4. Tratamento de periodicidade e valor de caução
    const periodicidadeParsed = parseInt(String(formData.get("periodicidade_reajuste_meses") || "12"), 10);
    const periodicidade_reajuste_meses = isNaN(periodicidadeParsed) ? 12 : periodicidadeParsed;

    const caucaoRaw = String(formData.get("valor_caucao") || "").trim();
    const valor_caucao = caucaoRaw !== "" && !isNaN(parseFloat(caucaoRaw)) ? parseFloat(caucaoRaw) : 0;

    const dataFimRaw = String(formData.get("data_fim") || "").trim();
    const data_fim = dataFimRaw !== "" ? dataFimRaw : null;

    // Geração do código único do contrato no padrão CT-{ano}-{sequencial}
    const anoContrato = dataInicio.slice(0, 4);
    const { data: codigosExistentes } = await supabase
      .from("contratos")
      .select("codigo")
      .like("codigo", `CT-${anoContrato}-%`);

    let maiorSequencial = 0;
    for (const row of codigosExistentes ?? []) {
      const sequencial = /CT-\d{4}-(\d+)/.exec(String(row?.codigo || ""));
      if (sequencial) {
        maiorSequencial = Math.max(maiorSequencial, parseInt(sequencial[1], 10));
      }
    }
    let proximoSequencial = maiorSequencial + 1;

    // 5. Payload exato correspondente ao DDL da tabela contratos
    const payload = {
      codigo: `CT-${anoContrato}-${String(proximoSequencial).padStart(3, "0")}`,
      imovel_id,
      inquilino_id,
      data_inicio: dataInicio,
      data_fim,
      dia_vencimento,
      valor_aluguel,
      indice_reajuste,
      periodicidade_reajuste_meses,
      valor_caucao,
      clausulas_especiais: String(formData.get("clausulas_especiais") || "").trim() || null,
      ativo: true,
      // Fiador 1 (Obrigatório)
      fiador_1_nome: String(formData.get("fiador_1_nome") || "").trim() || null,
      fiador_1_cpf: String(formData.get("fiador_1_cpf") || "").trim() || null,
      fiador_1_estado_civil: String(formData.get("fiador_1_estado_civil") || "").trim() || null,
      fiador_1_profissao: String(formData.get("fiador_1_profissao") || "").trim() || null,
      fiador_1_endereco: String(formData.get("fiador_1_endereco") || "").trim() || null,
      fiador_1_telefone: String(formData.get("fiador_1_telefone") || "").trim() || null,
      // Fiador 2 (Opcional)
      fiador_2_nome: String(formData.get("fiador_2_nome") || "").trim() || null,
      fiador_2_cpf: String(formData.get("fiador_2_cpf") || "").trim() || null,
      fiador_2_estado_civil: String(formData.get("fiador_2_estado_civil") || "").trim() || null,
      fiador_2_profissao: String(formData.get("fiador_2_profissao") || "").trim() || null,
      fiador_2_endereco: String(formData.get("fiador_2_endereco") || "").trim() || null,
      fiador_2_telefone: String(formData.get("fiador_2_telefone") || "").trim() || null,
    };

    // Código é UNIQUE: em caso de concorrência (23505), tenta o próximo sequencial.
    let insertError: { code?: string; message?: string } | null = null;
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const resultado = await supabase.from("contratos").insert([payload]);
      insertError = resultado.error ?? null;
      if (!insertError) break;
      if (insertError.code === "23505") {
        proximoSequencial += 1;
        payload.codigo = `CT-${anoContrato}-${String(proximoSequencial).padStart(3, "0")}`;
        continue;
      }
      break;
    }

    if (insertError) {
      console.error("Erro do Supabase ao inserir contrato:", insertError);
      return { success: false, error: `Erro no Supabase (${insertError.code}): ${insertError.message}` };
    }

    // 6. Imóvel vinculado a um inquilino: status muda para "Alugado"
    const { error: statusImovelError } = await supabase
      .from("imoveis")
      .update({ status: "Alugado" })
      .eq("id", imovel_id);
    if (statusImovelError) {
      console.error("Falha ao atualizar status do imóvel para Alugado:", statusImovelError);
    }

    // 7. Criar estrutura de pastas no Google Drive para o inquilino
    try {
      const { data: imovel } = await supabase
        .from("imoveis")
        .select("logradouro, numero, bairro, cidade, uf")
        .eq("id", imovel_id)
        .single();

      const { data: inquilino } = await supabase
        .from("inquilinos")
        .select("nome")
        .eq("id", inquilino_id)
        .single();

      if (imovel && inquilino) {
        const enderecoImovel = [
          [imovel.logradouro, imovel.numero].filter(Boolean).join(", "),
          imovel.bairro,
          `${imovel.cidade}/${imovel.uf}`,
        ].filter(Boolean).join(" - ");

        await createTenantFolderStructure(enderecoImovel, inquilino.nome);
        console.log(`Estrutura de pastas criada no Google Drive para: ${enderecoImovel} / ${inquilino.nome}`);
      }
    } catch (gdError) {
      console.warn("Falha ao criar estrutura de pastas no Google Drive:", gdError);
    }

    revalidatePath("/contratos");
    revalidatePath("/imoveis");
    revalidatePath("/");

    return { success: true, error: null };
  } catch (err: any) {
    console.error("Exceção capturada em criarContrato:", err?.message || err);
    return { success: false, error: err?.message || "Ocorreu um erro interno ao cadastrar o contrato." };
  }
}

export async function gerarReajustesPendentes() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("gerar_reajustes_pendentes");
  if (error) console.error("Erro em gerarReajustesPendentes:", error.message);
  revalidatePath("/contratos");
}

export async function aplicarReajuste(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.rpc("aplicar_reajuste", { p_reajuste_id: id });
  if (error) console.error("Erro em aplicarReajuste:", error.message);
  revalidatePath("/contratos");
}

export async function renovarContrato(formData: FormData): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const contratoId = String(formData.get("contrato_id") || "");
    const dataInicio = String(formData.get("data_inicio") || "").trim();
    const dataFimInformada = String(formData.get("data_fim") || "").trim() || null;

    if (!contratoId || !/^\d{4}-\d{2}-\d{2}$/.test(dataInicio)) {
      return { error: "Parâmetros de renovação inválidos." };
    }

    // 1. Carrega o contrato atual com todos os dados que serão herdados
    const { data: contrato } = await supabase
      .from("contratos")
      .select("*")
      .eq("id", contratoId)
      .single();

    if (!contrato) {
      return { error: "Contrato original não encontrado." };
    }

    const imovelId = String(contrato.imovel_id || "");
    const inquilinoId = String(contrato.inquilino_id || "");
    if (!imovelId || !inquilinoId) {
      return { error: "O contrato original não possui imóvel/inquilino vinculados." };
    }

    // Aluguel vigente: mesma prioridade exibida na listagem e no diálogo
    const valorVigente = Number(contrato.valor_aluguel ?? contrato.valor_atual ?? 0);
    if (!(valorVigente > 0)) {
      return { error: "O contrato atual não possui um valor de aluguel válido para renovação." };
    }

    const periodicidade = Number(contrato.periodicidade_reajuste_meses || 12) || 12;
    const indiceReajuste = (contrato.indice_reajuste || "IGP-M") as "IGP-M" | "IPCA" | "Outro";

    // 2. Busca a última variação 12m do índice do contrato (armazenada em %, ex.: 4.52)
    const { data: indices, error: indiceError } = await supabase
      .from("indices_economicos")
      .select("variacao_12m")
      .eq("indice", indiceReajuste)
      .order("mes_referencia", { ascending: false })
      .limit(1);

    if (indiceError) {
      console.error("Falha ao buscar índice econômico na renovação:", indiceError);
      return { error: "Não foi possível consultar o índice de reajuste." };
    }

    const variacaoPercentual = Number(indices?.[0]?.variacao_12m ?? 0) || 0;
    const taxa = variacaoPercentual / 100; // converte % para fração

    // 3. Novo valor: aplica o índice e arredonda PARA CIMA ao próximo múltiplo de R$ 5
    //    (trabalha em centavos inteiros para evitar erros de ponto flutuante)
    const centavosAjustados = Math.round(valorVigente * (1 + taxa) * 100);
    const valorNovo = Math.ceil(centavosAjustados / 500) * 5;

    // 4. Data fim do novo período: informada ou início + periodicidade − 1 dia
    const dataFim =
      dataFimInformada ??
      calcularDataFimContratual({
        data_inicio: dataInicio,
        data_fim: null,
        periodicidade_reajuste_meses: periodicidade,
      });

    // 5. Geração do código único no padrão CT-{ano}-{sequencial} (igual ao criarContrato)
    const anoContrato = dataInicio.slice(0, 4);
    const { data: codigosExistentes } = await supabase
      .from("contratos")
      .select("codigo")
      .like("codigo", `CT-${anoContrato}-%`);

    let maiorSequencial = 0;
    for (const row of codigosExistentes ?? []) {
      const sequencial = /CT-\d{4}-(\d+)/.exec(String(row?.codigo || ""));
      if (sequencial) {
        maiorSequencial = Math.max(maiorSequencial, parseInt(sequencial[1], 10));
      }
    }
    let proximoSequencial = maiorSequencial + 1;

    // Cláusulas especiais: copia, removendo o código legado REN001- embutido
    const clausulasEspeciais =
      String(contrato.clausulas_especiais || "")
        .replace(/REN001-[A-Za-z0-9]+/g, "")
        .trim() || null;

    // 6. Payload do novo período: herda fiadores, caução, dia de vencimento e índice
    const payload: Record<string, unknown> = {
      codigo: `CT-${anoContrato}-${String(proximoSequencial).padStart(3, "0")}`,
      imovel_id: imovelId,
      inquilino_id: inquilinoId,
      data_inicio: dataInicio,
      data_fim: dataFim,
      dia_vencimento: contrato.dia_vencimento ?? 10,
      valor_aluguel: valorNovo,
      valor_atual: valorNovo,
      indice_reajuste: indiceReajuste,
      periodicidade_reajuste_meses: periodicidade,
      valor_caucao: contrato.valor_caucao ?? 0,
      clausulas_especiais: clausulasEspeciais,
      ativo: true,
      fiador_1_nome: contrato.fiador_1_nome ?? null,
      fiador_1_cpf: contrato.fiador_1_cpf ?? null,
      fiador_1_estado_civil: contrato.fiador_1_estado_civil ?? null,
      fiador_1_profissao: contrato.fiador_1_profissao ?? null,
      fiador_1_endereco: contrato.fiador_1_endereco ?? null,
      fiador_1_telefone: contrato.fiador_1_telefone ?? null,
      fiador_2_nome: contrato.fiador_2_nome ?? null,
      fiador_2_cpf: contrato.fiador_2_cpf ?? null,
      fiador_2_estado_civil: contrato.fiador_2_estado_civil ?? null,
      fiador_2_profissao: contrato.fiador_2_profissao ?? null,
      fiador_2_endereco: contrato.fiador_2_endereco ?? null,
      fiador_2_telefone: contrato.fiador_2_telefone ?? null,
    };

    // Código é UNIQUE: em caso de concorrência (23505), tenta o próximo sequencial.
    let insertError: { code?: string; message?: string } | null = null;
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const resultado = await supabase.from("contratos").insert([payload]);
      insertError = (resultado.error as { code?: string; message?: string } | null) ?? null;
      if (!insertError) break;
      if (insertError.code === "23505") {
        proximoSequencial += 1;
        payload.codigo = `CT-${anoContrato}-${String(proximoSequencial).padStart(3, "0")}`;
        continue;
      }
      break;
    }

    if (insertError) {
      console.error("Erro do Supabase ao inserir contrato renovado:", insertError);
      return { error: `Erro no Supabase (${insertError.code}): ${insertError.message}` };
    }

    // 7. Encerra o contrato anterior: os dados ficam preservados, apenas o status muda.
    //    Evita dois contratos ativos no mesmo imóvel (cobranças/reajustes duplicados).
    const { error: encerrarAnteriorError } = await supabase
      .from("contratos")
      .update({ ativo: false })
      .eq("id", contratoId);

    if (encerrarAnteriorError) {
      // Não crítico: o novo período já foi criado; o antigo será encerrado pelo
      // vencimento automático (data_fim passada) na próxima visita à listagem.
      console.error("Falha ao encerrar o contrato anterior na renovação:", encerrarAnteriorError);
    }

    // 8. Imóvel permanece "Alugado" com o novo período
    const { error: statusImovelError } = await supabase
      .from("imoveis")
      .update({ status: "Alugado" })
      .eq("id", imovelId);
    if (statusImovelError) {
      console.error("Falha ao marcar imóvel como Alugado na renovação:", statusImovelError);
    }

    revalidatePath("/contratos");
    revalidatePath("/imoveis");
    revalidatePath("/");
    return { error: null };
  } catch (cause: any) {
    console.error("Exceção ao renovar contrato:", cause);
    return { error: cause?.message || "Não foi possível renovar o contrato." };
  }
}

export async function encerrarContrato(formData: FormData): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const contratoId = String(formData.get("id") || "");

    if (!contratoId) {
      return { error: "ID do contrato não informado." };
    }

    const { data: contrato } = await supabase
      .from("contratos")
      .select("imovel_id")
      .eq("id", contratoId)
      .single();

    const { error } = await supabase
      .from("contratos")
      .update({ ativo: false })
      .eq("id", contratoId);

    if (error) return { error: error.message };

    if (contrato?.imovel_id) {
      // Só devolve o imóvel para "Disponível" se não houver outro contrato ativo nele
      const { count, error: consultaError } = await supabase
        .from("contratos")
        .select("id", { count: "exact", head: true })
        .eq("imovel_id", contrato.imovel_id)
        .eq("ativo", true)
        .neq("id", contratoId);

      if (consultaError) {
        console.error("Falha ao verificar contratos ativos do imóvel:", consultaError);
      } else if (!count) {
        const { error: statusImovelError } = await supabase
          .from("imoveis")
          .update({ status: "Disponível" })
          .eq("id", contrato.imovel_id);
        if (statusImovelError) {
          console.error("Falha ao liberar o imóvel para Disponível:", statusImovelError);
        }
      }
    }

    revalidatePath("/contratos");
    revalidatePath("/imoveis");
    revalidatePath("/");
    return { error: null };
  } catch (cause: any) {
    return { error: cause?.message || "Não foi possível encerrar o contrato." };
  }
}