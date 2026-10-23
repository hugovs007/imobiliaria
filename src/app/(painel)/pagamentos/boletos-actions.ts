"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { obterConfigBB, CHAVE_ULTIMA_SINCRONIZACAO } from "@/lib/bb/config";
import { BBError, converterDataBB, listarBoletosBB, registrarBoletoBB } from "@/lib/bb/client";

export type ResultadoBoleto = { ok: boolean; message: string };

function hojeBrasil(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function soDigitos(texto: string | null | undefined): string {
  return String(texto || "").replace(/\D+/g, "");
}

/**
 * Reserva o próximo "nosso número" (sequencial de 13 dígitos) para a mensalidade.
 * O índice único no banco protege contra duas emissões simultâneas.
 */
async function reservarNossoNumero(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pagamentoId: string
): Promise<string | null> {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { data } = await supabase
      .from("pagamentos")
      .select("boleto_nosso_numero")
      .not("boleto_nosso_numero", "is", null);

    let maximo = 0;
    for (const linha of data ?? []) {
      const numero = parseInt(String(linha.boleto_nosso_numero), 10);
      if (!Number.isNaN(numero) && numero > maximo) maximo = numero;
    }

    const nosso = String(maximo + 1).padStart(13, "0");
    const { error } = await supabase
      .from("pagamentos")
      .update({ boleto_nosso_numero: nosso })
      .eq("id", pagamentoId)
      .is("boleto_nosso_numero", null);

    if (!error) return nosso;
    if (error.code !== "23505") return null; // erro inesperado: aborta
    // 23505 = outro registro levou o número: recarrega o máximo e tenta de novo
  }
  return null;
}

/** Emite (registra) um boleto no BB para uma mensalidade. */
async function emitirBoletoInterno(pagamentoId: string): Promise<ResultadoBoleto> {
  const config = await obterConfigBB();
  if (!config) {
    return {
      ok: false,
      message: "Configure as credenciais do Banco do Brasil em Configurações antes de emitir boletos.",
    };
  }

  const supabase = await createClient();
  const { data: pagamento, error } = await supabase
    .from("pagamentos")
    .select("*, contratos (*, imoveis (*), inquilinos (*))")
    .eq("id", pagamentoId)
    .maybeSingle();

  if (error || !pagamento) return { ok: false, message: "Mensalidade não encontrada." };

  const contrato = Array.isArray(pagamento.contratos) ? pagamento.contratos[0] : pagamento.contratos;
  const inquilino = contrato?.inquilinos;
  const imovel = contrato?.imoveis;

  if (pagamento.status === "pago") return { ok: false, message: "Mensalidade já quitada." };
  if (pagamento.status === "isento") return { ok: false, message: "Mensalidade isenta." };
  if (pagamento.boleto_linha_digitavel) {
    return { ok: false, message: "Boleto já emitido para esta mensalidade." };
  }

  const valorBase = Number(pagamento.valor_base || 0);
  const valorPago = Number(pagamento.valor_pago || 0);
  const saldo = valorBase - valorPago;
  if (saldo <= 0.009) return { ok: false, message: "Mensalidade sem saldo em aberto." };

  if (!inquilino?.nome) return { ok: false, message: "Contrato sem inquilino vinculado." };
  const documento = soDigitos(inquilino.cpf_cnpj);
  if (documento.length !== 11 && documento.length !== 14) {
    return { ok: false, message: "CPF/CNPJ do inquilino inválido — corrija o cadastro do inquilino." };
  }

  const endereco = [imovel?.logradouro, imovel?.numero].filter(Boolean).join(", ").trim();
  const cep = soDigitos(imovel?.cep);
  if (!endereco || !imovel?.cidade || !imovel?.uf || cep.length !== 8) {
    return {
      ok: false,
      message: "Endereço do imóvel incompleto (logradouro, CEP, cidade e UF) — corrija o cadastro do imóvel.",
    };
  }

  const hoje = hojeBrasil();
  const vencimentoOriginal = String(pagamento.data_vencimento || "").slice(0, 10);
  if (!vencimentoOriginal) return { ok: false, message: "Mensalidade sem data de vencimento." };
  // O BB não aceita registro com vencimento no passado: atrasadas são emitidas para hoje.
  const vencimentoBoleto = vencimentoOriginal < hoje ? hoje : vencimentoOriginal;

  // Reaproveita reserva anterior (ex.: falha no BB após reservar) ou reserva novo número.
  let nossoNumero = pagamento.boleto_nosso_numero ? String(pagamento.boleto_nosso_numero) : null;
  if (!nossoNumero) {
    nossoNumero = await reservarNossoNumero(supabase, pagamentoId);
    if (!nossoNumero) {
      return { ok: false, message: "Não foi possível reservar o nosso número — tente novamente." };
    }
  }

  const numeroTituloCliente = config.convenio.padStart(7, "0") + nossoNumero; // 20 dígitos

  try {
    const boleto = await registrarBoletoBB(config, {
      dataEmissao: hoje,
      dataVencimento: vencimentoBoleto,
      valorOriginal: saldo,
      numeroTituloCliente,
      pagador: {
        tipoInscricao: documento.length === 11 ? 1 : 2,
        numeroInscricao: documento,
        nome: String(inquilino.nome).slice(0, 60),
        endereco,
        cep,
        cidade: String(imovel.cidade),
        bairro: String(imovel?.bairro || ""),
        uf: String(imovel.uf),
      },
    });

    const { error: erroUpdate } = await supabase
      .from("pagamentos")
      .update({
        boleto_linha_digitavel: boleto.linhaDigitavel,
        boleto_codigo_barras: boleto.codigoBarraNumerico,
        boleto_pdf_url: boleto.pdfUrl,
        boleto_bb_numero: boleto.numero,
        boleto_situacao: "titulo nao pago",
        boleto_registrado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", pagamentoId);

    if (erroUpdate) throw new Error(erroUpdate.message);

    const notaVencimento =
      vencimentoBoleto !== vencimentoOriginal ? " (vencimento original no passado — boleto emitido para hoje)" : "";
    return { ok: true, message: `Boleto emitido (nosso nº ${nossoNumero}).${notaVencimento}` };
  } catch (err) {
    // Libera o nosso número reservado para não travar a sequência.
    await supabase.from("pagamentos").update({ boleto_nosso_numero: null }).eq("id", pagamentoId);
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    return { ok: false, message: `Falha ao emitir boleto: ${msg}` };
  }
}

/** Emite boleto de uma mensalidade (botão por linha). */
export async function emitirBoletoAction(
  _prev: ResultadoBoleto,
  formData: FormData
): Promise<ResultadoBoleto> {
  try {
    const pagamentoId = String(formData.get("pagamento_id") || "").trim();
    if (!pagamentoId) return { ok: false, message: "Mensalidade não informada." };
    const resultado = await emitirBoletoInterno(pagamentoId);
    revalidatePath("/pagamentos");
    return resultado;
  } catch (err) {
    console.error("Exceção em emitirBoletoAction:", err);
    return { ok: false, message: "Erro inesperado ao emitir boleto." };
  }
}

/** Emite boletos de todas as mensalidades em aberto de um contrato. */
export async function emitirBoletosContratoAction(
  _prev: ResultadoBoleto,
  formData: FormData
): Promise<ResultadoBoleto> {
  try {
    const contratoId = String(formData.get("contrato_id") || "").trim();
    if (!contratoId) return { ok: false, message: "Contrato não informado." };

    const supabase = await createClient();
    const { data: pendentes, error } = await supabase
      .from("pagamentos")
      .select("id")
      .eq("contrato_id", contratoId)
      .in("status", ["pendente", "atrasado"])
      .is("boleto_linha_digitavel", null);

    if (error) return { ok: false, message: `Erro ao listar mensalidades: ${error.message}` };
    if (!pendentes || pendentes.length === 0) {
      return { ok: true, message: "Nenhuma mensalidade em aberto sem boleto." };
    }

    let emitidos = 0;
    let primeiroErro: string | null = null;

    for (const p of pendentes) {
      const resultado = await emitirBoletoInterno(String(p.id));
      if (resultado.ok) emitidos++;
      else if (!primeiroErro) primeiroErro = resultado.message;
    }

    revalidatePath("/pagamentos");

    if (emitidos === 0) {
      return { ok: false, message: primeiroErro || "Nenhum boleto foi emitido." };
    }
    return {
      ok: true,
      message: primeiroErro
        ? `${emitidos} boleto(s) emitido(s). Atenção: ${primeiroErro}`
        : `${emitidos} boleto(s) emitido(s).`,
    };
  } catch (err) {
    console.error("Exceção em emitirBoletosContratoAction:", err);
    return { ok: false, message: "Erro inesperado ao emitir boletos." };
  }
}

/**
 * Consulta os boletos registrados no BB e dá baixa automática nos que foram pagos.
 * A baixa espelha o lançamento manual (registrarPagamento): cria movimentação,
 * soma ao valor pago e atualiza o status da mensalidade.
 */
async function sincronizarBaixasInterno(): Promise<ResultadoBoleto> {
  const config = await obterConfigBB();
  if (!config) {
    return { ok: false, message: "Configure as credenciais do Banco do Brasil em Configurações." };
  }

  const supabase = await createClient();
  const { data: pendentes, error } = await supabase
    .from("pagamentos")
    .select("id, boleto_nosso_numero, data_vencimento, valor_base, valor_pago, status")
    .not("boleto_nosso_numero", "is", null)
    .neq("status", "pago")
    .neq("status", "isento");

  if (error) return { ok: false, message: `Erro ao carregar boletos pendentes: ${error.message}` };
  if (!pendentes || pendentes.length === 0) {
    return { ok: true, message: "Nenhuma mensalidade com boleto aguardando pagamento." };
  }

  // Consulta o BB em janelas de 30 dias (limite seguro de intervalo da API).
  const vencimentos = pendentes
    .map((p) => String(p.data_vencimento || "").slice(0, 10))
    .filter(Boolean)
    .sort();
  if (vencimentos.length === 0) {
    return { ok: false, message: "Mensalidades com boleto sem data de vencimento." };
  }

  const boletosBB: Awaited<ReturnType<typeof listarBoletosBB>> = [];
  const umDiaMs = 24 * 60 * 60 * 1000;
  let janelaInicioMs = new Date(`${vencimentos[0]}T00:00:00Z`).getTime();
  const fimMs = new Date(`${vencimentos[vencimentos.length - 1]}T00:00:00Z`).getTime();

  while (janelaInicioMs <= fimMs) {
    const janelaFimMs = Math.min(janelaInicioMs + 29 * umDiaMs, fimMs);
    const parte = await listarBoletosBB(config, {
      indicadorSituacao: "T",
      dataVencimentoInicial: new Date(janelaInicioMs).toISOString().slice(0, 10),
      dataVencimentoFinal: new Date(janelaFimMs).toISOString().slice(0, 10),
    });
    boletosBB.push(...parte);
    janelaInicioMs = janelaFimMs + umDiaMs;
  }

  const mapaPendentes = new Map(pendentes.map((p) => [String(p.boleto_nosso_numero), p]));
  let baixados = 0;

  for (const bb of boletosBB) {
    const nosso = String(bb.numeroTituloCliente || "").slice(-13);
    const pagamento = mapaPendentes.get(nosso);
    if (!pagamento) continue;

    const situacao = String(bb.situacaoTitulo || "").toLowerCase();
    const pago = situacao.includes("pago") && !situacao.includes("nao pago");

    if (!pago) {
      // Só atualiza a situação cadastral do boleto (ex.: "titulo nao pago").
      await supabase.from("pagamentos").update({ boleto_situacao: bb.situacaoTitulo }).eq("id", pagamento.id);
      continue;
    }

    const valorRecebido = Number(bb.valorRecebido ?? bb.valorOriginal ?? pagamento.valor_base ?? 0);
    const dataRecebimento = converterDataBB(bb.dataRecebimento) || hojeBrasil();

    // Evita baixa duplicada se a sincronização rodar duas vezes.
    const { data: jaExiste } = await supabase
      .from("movimentacoes_pagamento")
      .select("id")
      .eq("pagamento_id", pagamento.id)
      .eq("forma_pagamento", "Boleto")
      .eq("data_pagamento", dataRecebimento)
      .limit(1);
    if (jaExiste && jaExiste.length > 0) continue;

    const valorBase = Number(pagamento.valor_base || 0);
    const pagoAnterior = Number(pagamento.valor_pago || 0);
    const totalPago = pagoAnterior + valorRecebido;
    const saldoAnterior = Math.max(0, valorBase - pagoAnterior);
    const saldoRestante = Math.max(0, valorBase - totalPago);
    const vencido = String(pagamento.data_vencimento || "").slice(0, 10) < dataRecebimento;
    const quitado = totalPago >= valorBase - 0.01;

    // Histórico — espelha o lançamento manual do PDV (registrarPagamento).
    const { error: erroMov } = await supabase.from("movimentacoes_pagamento").insert({
      pagamento_id: pagamento.id,
      valor_pago: valorRecebido,
      forma_pagamento: "Boleto",
      data_pagamento: dataRecebimento,
      saldo_anterior: saldoAnterior,
      saldo_restante: saldoRestante,
      observacoes: "Baixa automática via Banco do Brasil",
    });
    if (erroMov) {
      console.error("Erro ao registrar movimentação de baixa:", erroMov);
      continue;
    }

    const { error: erroUpdate } = await supabase
      .from("pagamentos")
      .update({
        valor_pago: totalPago,
        data_pagamento: dataRecebimento,
        status: quitado ? "pago" : vencido ? "atrasado" : "pendente",
        boleto_situacao: bb.situacaoTitulo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pagamento.id);
    if (erroUpdate) {
      console.error("Erro ao dar baixa no pagamento:", erroUpdate);
      continue;
    }

    baixados++;
  }

  // Marca a última sincronização (throttle da sincronização automática).
  await supabase
    .from("configuracoes")
    .upsert(
      { chave: CHAVE_ULTIMA_SINCRONIZACAO, valor: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "chave" }
    );

  return {
    ok: true,
    message:
      baixados > 0
        ? `${baixados} pagamento(s) baixado(s) automaticamente.`
        : "Nenhum pagamento novo no BB ainda.",
  };
}

/** Sincroniza baixas (botão manual na página de Pagamentos). */
export async function sincronizarBaixaAction(
  _prev: ResultadoBoleto,
  _formData: FormData
): Promise<ResultadoBoleto> {
  try {
    const resultado = await sincronizarBaixasInterno();
    revalidatePath("/pagamentos");
    return resultado;
  } catch (err) {
    console.error("Exceção em sincronizarBaixaAction:", err);
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    return { ok: false, message: `Falha na sincronização com o BB: ${msg}` };
  }
}

/**
 * Sincronização "preguiçosa": chamada ao abrir a página de Pagamentos,
 * no máximo uma vez a cada 2 horas. Nunca quebra a renderização da página.
 */
export async function sincronizarBaixasSePendente(): Promise<void> {
  try {
    const config = await obterConfigBB();
    if (!config) return;

    const supabase = await createClient();
    const { data } = await supabase
      .from("configuracoes")
      .select("valor")
      .eq("chave", CHAVE_ULTIMA_SINCRONIZACAO)
      .maybeSingle();

    const ultima = data?.valor ? new Date(data.valor).getTime() : 0;
    if (Number.isFinite(ultima) && Date.now() - ultima < 2 * 60 * 60 * 1000) return;

    await sincronizarBaixasInterno();
  } catch (err) {
    console.error("Exceção em sincronizarBaixasSePendente:", err);
  }
}
