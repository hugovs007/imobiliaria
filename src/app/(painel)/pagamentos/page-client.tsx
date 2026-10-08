"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Alert, Button, Card, Field, Input, Money, PageHeader, Select, StatusBadge, Table } from "@/components/ui";
import {
  atualizarAtrasados,
  excluirPagamento,
  lancarCobranca,
  lancarCobrancasEmLote,
  lancarCobrancasVigencia,
  marcarIsento,
  registrarPagamento,
} from "./actions";

function formatarEnderecoImovel(imovel: any): string {
  if (!imovel) return "Endereço não informado";
  const rua = imovel.logradouro || imovel.endereco;
  const cidadeUf = [imovel.cidade, imovel.uf || imovel.estado].filter(Boolean).join("/");

  const partes = [
    [rua, imovel.numero].filter(Boolean).join(", "),
    imovel.bairro,
    cidadeUf,
  ].filter(Boolean);

  return partes.length > 0 ? partes.join(" - ") : "Endereço não informado";
}

/**
 * Interpreta uma data "YYYY-MM-DD" como horário local (meia-noite).
 * Sem isso, o JS interpreta como UTC e, no Brasil (UTC-3), exibiria o dia anterior.
 */
function dataLocal(dataRaw: string): Date {
  const soData = /^(\d{4}-\d{2}-\d{2})/.exec(dataRaw);
  return new Date(soData ? `${soData[1]}T00:00:00` : dataRaw);
}

function formatarDataSegura(dataRaw: string | null | undefined, opcoes?: Intl.DateTimeFormatOptions): string {
  if (!dataRaw) return "—";
  try {
    const dataObj = dataLocal(dataRaw);
    if (isNaN(dataObj.getTime())) return "—";
    return dataObj.toLocaleDateString("pt-BR", opcoes);
  } catch {
    return "—";
  }
}

function calcularIdentificacaoParcela(contrato: any, competencia: string): string {
  if (!contrato?.data_inicio || !contrato?.data_fim || !competencia) return "—";
  try {
    const dataInicio = dataLocal(contrato.data_inicio);
    const dataFim = dataLocal(contrato.data_fim);
    const dataCompetencia = dataLocal(competencia);

    if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime()) || isNaN(dataCompetencia.getTime())) {
      return "—";
    }

    const diferencaMeses = (dataFim.getFullYear() - dataInicio.getFullYear()) * 12 + dataFim.getMonth() - dataInicio.getMonth();
    const mesesContrato = Math.max(1, diferencaMeses + (dataFim.getDate() >= dataInicio.getDate() ? 1 : 0));
    const parcelaAtual = (dataCompetencia.getFullYear() - dataInicio.getFullYear()) * 12 + dataCompetencia.getMonth() - dataInicio.getMonth() + 1;

    if (mesesContrato > 0 && parcelaAtual > 0 && parcelaAtual <= mesesContrato) {
      return `${String(parcelaAtual).padStart(2, "0")}/${String(mesesContrato).padStart(2, "0")}`;
    }
  } catch {
    return "—";
  }
  return "—";
}

function contratoDoPagamento(pagamento: any): any {
  return Array.isArray(pagamento.contratos) ? pagamento.contratos[0] : pagamento.contratos;
}

function contarMesesVigencia(contrato: any): number {
  if (!contrato?.data_inicio || !contrato?.data_fim) return 0;
  const inicio = dataLocal(contrato.data_inicio);
  const fim = dataLocal(contrato.data_fim);
  if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return 0;
  const meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + fim.getMonth() - inicio.getMonth();
  // Mesma regra do lançamento das mensalidades: o aluguel é pago antecipadamente,
  // então o mês da data_fim só entra na contagem quando a vigência chegou ao dia
  // do aniversário do contrato.
  return Math.max(1, meses + (fim.getDate() >= inicio.getDate() ? 1 : 0));
}

// toISOString() retorna UTC: após as 21:00 de Brasília já seria "amanhã".
// Por isso calculamos a data de hoje no fuso do Brasil (en-CA => formato YYYY-MM-DD).
// Calculada na renderização (e não só no carregamento da página) para não ficar
// defasada caso a aba permaneça aberta na virada do dia.
function hojeBrasil(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

const FORMAS_PAGAMENTO = [
  { value: "PIX", label: "PIX" },
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Cartão de Débito", label: "Cartão de Débito" },
  { value: "Cartão de Crédito", label: "Cartão de Crédito" },
  { value: "Transferência Bancária", label: "Transferência Bancária" },
];

function BotaoConfirmarRecebimento() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando..." : "Confirmar recebimento"}
    </Button>
  );
}

export default function PagamentosClient({
  initialPagamentos,
  initialContratos,
  error,
}: {
  initialPagamentos: any[];
  initialContratos: any[];
  error: string | null;
}) {
  const pagamentos = initialPagamentos;
  const contratos = initialContratos;

  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("todos");
  const [contratoAbertoId, setContratoAbertoId] = useState<string | null>(null);
  const [recebendo, setRecebendo] = useState<any | null>(null);
  const [avulsaAberta, setAvulsaAberta] = useState(false);

  // Fecha o modal com Escape e trava o scroll do fundo enquanto ele estiver aberto
  useEffect(() => {
    if (!recebendo) return;

    const aoApertarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setRecebendo(null);
    };

    window.addEventListener("keydown", aoApertarTecla);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", aoApertarTecla);
      document.body.style.overflow = "";
    };
  }, [recebendo]);

  const pagamentosPorContrato = useMemo(() => {
    const mapa = new Map<string, any[]>();
    for (const p of pagamentos) {
      const contrato = contratoDoPagamento(p);
      if (!contrato?.id) continue;
      const lista = mapa.get(String(contrato.id)) ?? [];
      lista.push(p);
      mapa.set(String(contrato.id), lista);
    }
    return mapa;
  }, [pagamentos]);

  const stats = useMemo(() => {
    const emAberto = pagamentos.filter((p) => p.status === "pendente" || p.status === "atrasado");
    return {
      aReceber: emAberto.reduce((total, p) => total + Math.max(0, Number(p.valor_base || 0) - Number(p.valor_pago || 0)), 0),
      recebido: pagamentos.reduce((total, p) => total + Number(p.valor_pago || 0), 0),
      atrasadas: pagamentos.filter((p) => p.status === "atrasado").length,
      emAberto: emAberto.length,
    };
  }, [pagamentos]);

  const linhasInquilinos = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const linhas = contratos.map((contrato) => {
      const pagamentosContrato = pagamentosPorContrato.get(String(contrato.id)) ?? [];
      const emAbertoLista = pagamentosContrato.filter((p) => p.status === "pendente" || p.status === "atrasado");

      return {
        contrato,
        pagamentos: pagamentosContrato,
        emAberto: emAbertoLista.reduce(
          (total, p) => total + Math.max(0, Number(p.valor_base || 0) - Number(p.valor_pago || 0)),
          0
        ),
        atrasadas: pagamentosContrato.filter((p) => p.status === "atrasado").length,
        emAbertoCount: emAbertoLista.length,
      };
    });

    const filtradas = linhas.filter((linha) => {
      const contrato = linha.contrato;
      if (termo) {
        const texto = `${contrato.inquilinos?.nome || ""} ${formatarEnderecoImovel(contrato.imoveis)} ${contrato.codigo || ""}`.toLowerCase();
        if (!texto.includes(termo)) return false;
      }
      if (filtroSituacao === "atraso" && linha.atrasadas === 0) return false;
      if (filtroSituacao === "aberto" && linha.emAbertoCount === 0) return false;
      if (filtroSituacao === "dia" && (linha.atrasadas > 0 || linha.emAbertoCount > 0)) return false;
      if (filtroSituacao === "encerrados" && contrato.ativo !== false) return false;
      return true;
    });

    return filtradas.sort((a, b) => {
      const ativoA = a.contrato.ativo !== false ? 0 : 1;
      const ativoB = b.contrato.ativo !== false ? 0 : 1;
      if (ativoA !== ativoB) return ativoA - ativoB;
      if (a.atrasadas !== b.atrasadas) return b.atrasadas - a.atrasadas;
      if (a.emAberto !== b.emAberto) return b.emAberto - a.emAberto;
      return (a.contrato.inquilinos?.nome || "").localeCompare(b.contrato.inquilinos?.nome || "");
    });
  }, [contratos, pagamentosPorContrato, busca, filtroSituacao]);

  const contratoAberto = useMemo(
    () => contratos.find((c) => String(c.id) === contratoAbertoId) ?? null,
    [contratos, contratoAbertoId]
  );

  const pagamentosContratoAberto = useMemo(() => {
    if (!contratoAbertoId) return [];
    const lista = pagamentosPorContrato.get(contratoAbertoId) ?? [];
    const ordem: Record<string, number> = { atrasado: 0, pendente: 1, isento: 2, pago: 3 };
    return [...lista].sort((a, b) => {
      const prioridadeA = ordem[a.status] ?? 2;
      const prioridadeB = ordem[b.status] ?? 2;
      if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;
      if (prioridadeA <= 1) return String(a.data_vencimento || "").localeCompare(String(b.data_vencimento || ""));
      return String(b.competencia || "").localeCompare(String(a.competencia || ""));
    });
  }, [contratoAbertoId, pagamentosPorContrato]);

  const resumoContrato = useMemo(() => {
    if (!contratoAberto) return null;
    const emAbertoLista = pagamentosContratoAberto.filter((p) => p.status === "pendente" || p.status === "atrasado");
    return {
      emAberto: emAbertoLista.reduce(
        (total, p) => total + Math.max(0, Number(p.valor_base || 0) - Number(p.valor_pago || 0)),
        0
      ),
      atrasadas: pagamentosContratoAberto.filter((p) => p.status === "atrasado").length,
      recebido: pagamentosContratoAberto.reduce((total, p) => total + Number(p.valor_pago || 0), 0),
      total: pagamentosContratoAberto.length,
    };
  }, [contratoAberto, pagamentosContratoAberto]);

  const receber = async (formData: FormData) => {
    await registrarPagamento(formData);
    setRecebendo(null);
  };

  if (error) {
    return (
      <div>
        <PageHeader title="Pagamentos" subtitle="Cobranças mensais dos contratos, recebimentos e recibos." />
        <Alert variant="destructive" className="mt-4">
          <strong>Erro ao carregar dados:</strong> {error}
        </Alert>
      </div>
    );
  }

  const recebimentoInfo = recebendo
    ? {
        inquilino:
          (Array.isArray(recebendo.contratos) ? recebendo.contratos[0] : recebendo.contratos)?.inquilinos?.nome || "—",
        competencia: formatarDataSegura(recebendo.competencia, { month: "2-digit", year: "numeric" }),
        saldo: Math.max(0, Number(recebendo.valor_base || 0) - Number(recebendo.valor_pago || 0)),
      }
    : null;

  return (
    <div>
      {contratoAberto && resumoContrato ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <PageHeader
              title={contratoAberto.inquilinos?.nome || "Cobranças"}
              subtitle={formatarEnderecoImovel(contratoAberto.imoveis)}
            />
            <Button
              variant="ghost"
              type="button"
              className="mt-1"
              onClick={() => {
                setContratoAbertoId(null);
                setAvulsaAberta(false);
                setRecebendo(null);
              }}
            >
              ← Voltar aos inquilinos
            </Button>
          </div>

          <Card className="mb-6">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
              <div>
                <div className="text-xs" style={{ color: "var(--color-ink-soft)" }}>Contrato</div>
                <div className="font-medium">{contratoAberto.codigo || "—"}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: "var(--color-ink-soft)" }}>Vigência</div>
                <div className="font-medium">
                  {formatarDataSegura(contratoAberto.data_inicio)} → {formatarDataSegura(contratoAberto.data_fim)}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: "var(--color-ink-soft)" }}>Vencimento</div>
                <div className="font-medium">Dia {contratoAberto.dia_vencimento}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: "var(--color-ink-soft)" }}>Aluguel</div>
                <div className="font-medium">
                  <Money value={Number(contratoAberto.valor_aluguel || 0)} />
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: "var(--color-ink-soft)" }}>Contato</div>
                <div className="font-medium">{contratoAberto.inquilinos?.telefone || "—"}</div>
              </div>
              <StatusBadge status={contratoAberto.ativo !== false ? "ativo" : "encerrado"} />
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
            <Card>
              <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-warn)" }}>
                <Money value={resumoContrato.emAberto} />
              </div>
              <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Em aberto</div>
            </Card>
            <Card>
              <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-alert)" }}>
                {resumoContrato.atrasadas}
              </div>
              <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Atrasadas</div>
            </Card>
            <Card>
              <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ok)" }}>
                <Money value={resumoContrato.recebido} />
              </div>
              <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Recebido</div>
            </Card>
            <Card>
              <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
                {resumoContrato.total}
                {contarMesesVigencia(contratoAberto) > 0 && (
                  <span className="text-base font-normal" style={{ color: "var(--color-ink-soft)" }}>
                    {" "}de {contarMesesVigencia(contratoAberto)}
                  </span>
                )}
              </div>
              <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Mensalidades lançadas</div>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Button variant="ghost" type="button" onClick={() => setAvulsaAberta(!avulsaAberta)}>
              {avulsaAberta ? "Fechar" : "+ Cobrança avulsa"}
            </Button>
            <form
              action={lancarCobrancasVigencia}
              onSubmit={(e) => {
                const mesesVigencia = contarMesesVigencia(contratoAberto);
                const mensagem =
                  mesesVigencia > 0
                    ? `Gerar as ${mesesVigencia} mensalidades da vigência deste contrato? As já lançadas não serão alteradas.`
                    : "Gerar as mensalidades da vigência deste contrato? As já lançadas não serão alteradas.";
                if (!window.confirm(mensagem)) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="contrato_id" value={contratoAberto.id} />
              <Button>Gerar mensalidades da vigência</Button>
            </form>
          </div>

          {avulsaAberta && (
            <Card className="mb-6">
              <h4 className="font-medium" style={{ color: "var(--color-ink)" }}>
                Lançar cobrança avulsa
              </h4>
              <p className="mt-1 mb-4 text-xs" style={{ color: "var(--color-ink-soft)" }}>
                Para um mês específico, quando precisar de valor ou vencimento diferentes do padrão do contrato.
              </p>
              <form action={lancarCobranca} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <input type="hidden" name="contrato_id" value={contratoAberto.id} />
                <Field label="Competência (mês)" name="competencia" type="month" required />
                <Field label="Valor base (opcional)" name="valor_base" type="number" step="0.01" placeholder="Valor do aluguel" />
                <Field label="Vencimento (opcional)" name="data_vencimento" type="date" />
                <div className="flex items-end">
                  <Button>Lançar</Button>
                </div>
              </form>
            </Card>
          )}

          {pagamentosContratoAberto.length > 0 ? (
            <Table head={["Competência", "Vencimento", "Valor", "Pago", "Saldo", "Status", "Ações"]}>
              {pagamentosContratoAberto.map((p) => {
                const valorBase = Number(p.valor_base || 0);
                const valorPago = Number(p.valor_pago || 0);
                const saldo = Math.max(0, valorBase - valorPago);
                const podeReceber = saldo > 0.009 && p.status !== "isento";
                const parcela = calcularIdentificacaoParcela(contratoAberto, p.competencia);
                const movimentacoes = (Array.isArray(p.movimentacoes_pagamento) ? p.movimentacoes_pagamento : [])
                  .slice()
                  .sort((a: any, b: any) => String(a.data_pagamento || "").localeCompare(String(b.data_pagamento || "")));

                return (
                  <Fragment key={p.id}>
                  <tr style={{ borderTop: "1px solid var(--color-line)" }}>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div>{formatarDataSegura(p.competencia, { month: "2-digit", year: "numeric" })}</div>
                      {parcela !== "—" && (
                        <div className="text-xs" style={{ color: "var(--color-ink-soft)" }}>Parcela {parcela}</div>
                      )}
                    </td>
                    <td
                      className="px-4 py-2.5 whitespace-nowrap"
                      style={p.status === "atrasado" ? { color: "var(--color-alert)", fontWeight: 600 } : undefined}
                    >
                      {formatarDataSegura(p.data_vencimento)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Money value={valorBase} />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={valorPago > 0 ? { color: "var(--color-ok)" } : undefined}>
                      {valorPago > 0 ? <Money value={valorPago} /> : "—"}
                      {movimentacoes.length > 1 && (
                        <div className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                          {movimentacoes.length} entradas
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {p.status === "isento" ? (
                        <span style={{ color: "var(--color-ink-soft)" }}>Isenta</span>
                      ) : saldo > 0.009 ? (
                        <span className="font-semibold" style={{ color: "var(--color-warn)" }}>
                          <Money value={saldo} />
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-ok)" }}>Quitado</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {podeReceber && (
                          <Button variant="ghost" type="button" onClick={() => setRecebendo(p)}>
                            Receber
                          </Button>
                        )}
                        {p.status === "pago" && (
                          <Link
                            href={`/recibos/${p.id}`}
                            className="rounded-sm px-4 py-2 text-sm font-medium border"
                            style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
                          >
                            Recibo
                          </Link>
                        )}
                        {(p.status === "pendente" || p.status === "atrasado") && (
                          <form action={marcarIsento}>
                            <input type="hidden" name="id" value={p.id} />
                            <Button variant="ghost">Isentar</Button>
                          </form>
                        )}
                        {p.status !== "pago" && (
                          <form action={excluirPagamento}>
                            <input type="hidden" name="id" value={p.id} />
                            <Button variant="ghost">Excluir</Button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                  {movimentacoes.length > 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-2.5" style={{ background: "var(--color-paper-dim)" }}>
                        <div className="text-xs font-medium mb-1.5" style={{ color: "var(--color-ink-soft)" }}>
                          Recebimentos desta mensalidade
                        </div>
                        <div className="flex flex-col gap-1">
                          {movimentacoes.map((m: any) => (
                            <div key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              <span style={{ color: "var(--color-ink)" }}>{formatarDataSegura(m.data_pagamento)}</span>
                              <span className="font-semibold" style={{ color: "var(--color-ok)" }}>
                                <Money value={Number(m.valor_pago || 0)} />
                              </span>
                              <span style={{ color: "var(--color-ink-soft)" }}>via {m.forma_pagamento || "—"}</span>
                              {m.observacoes ? (
                                <span className="italic" style={{ color: "var(--color-ink-soft)" }}>
                                  “{m.observacoes}”
                                </span>
                              ) : null}
                              <Link
                                href={`/recibos/${m.id}?tipo=movimentacao`}
                                className="rounded-sm border px-2 py-0.5 font-medium"
                                style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
                              >
                                Recibo
                              </Link>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </Table>
          ) : (
            <Card className="text-center py-10">
              <p style={{ color: "var(--color-ink-soft)" }}>
                Nenhuma mensalidade lançada para este contrato. Use “Gerar mensalidades da vigência” para criar todas de uma vez.
              </p>
            </Card>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <PageHeader title="Pagamentos" subtitle="Cobranças mensais dos contratos, recebimentos e recibos." />
            <div className="mt-1 flex flex-wrap items-end gap-2">
              <form action={atualizarAtrasados}>
                <Button variant="ghost">Atualizar atrasados</Button>
              </form>
              <form action={lancarCobrancasEmLote} className="flex items-end gap-2">
                <Field label="Competência" name="competencia" type="month" required defaultValue={hojeBrasil().slice(0, 7)} />
                <Button variant="ghost">Gerar do mês (todos)</Button>
              </form>
            </div>
          </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
            <Money value={stats.aReceber} />
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>A receber</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ok)" }}>
            <Money value={stats.recebido} />
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Recebido</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-alert)" }}>
            {stats.atrasadas}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Parcelas atrasadas</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-warn)" }}>
            {stats.emAberto}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Parcelas em aberto</div>
        </Card>
      </div>

      <div className="mb-8">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <label className="flex w-64 flex-col gap-1 text-sm">
            <span style={{ color: "var(--color-ink-soft)" }}>Buscar</span>
            <Input
              placeholder="Inquilino, imóvel ou contrato"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>
          <label className="flex w-44 flex-col gap-1 text-sm">
            <span style={{ color: "var(--color-ink-soft)" }}>Situação</span>
            <select value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="atraso">Com atraso</option>
              <option value="aberto">Em aberto</option>
              <option value="dia">Em dia</option>
              <option value="encerrados">Encerrados</option>
            </select>
          </label>
        </div>

        {linhasInquilinos.length > 0 ? (
          <Table head={["Inquilino", "Imóvel", "Contrato / Vigência", "Aluguel", "Em aberto", "Situação", "Ações"]}>
            {linhasInquilinos.map((linha) => {
              const contrato = linha.contrato;
              const encerrado = contrato.ativo === false;

              return (
                <tr key={contrato.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{contrato.inquilinos?.nome || "—"}</div>
                    <div className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                      {contrato.inquilinos?.telefone || ""}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div>{formatarEnderecoImovel(contrato.imoveis)}</div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div>{contrato.codigo || "—"}</div>
                    <div className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                      {formatarDataSegura(contrato.data_inicio, { month: "2-digit", year: "numeric" })} →{" "}
                      {formatarDataSegura(contrato.data_fim, { month: "2-digit", year: "numeric" })}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <Money value={Number(contrato.valor_aluguel || 0)} />
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {linha.emAberto > 0.009 ? (
                      <span className="font-semibold" style={{ color: "var(--color-warn)" }}>
                        <Money value={linha.emAberto} />
                      </span>
                    ) : (
                      <span style={{ color: "var(--color-ink-soft)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      {linha.atrasadas > 0 ? (
                        <span className="font-medium" style={{ color: "var(--color-alert)" }}>
                          {linha.atrasadas} atrasada{linha.atrasadas > 1 ? "s" : ""}
                        </span>
                      ) : linha.emAbertoCount > 0 ? (
                        <span style={{ color: "var(--color-warn)" }}>{linha.emAbertoCount} em aberto</span>
                      ) : linha.pagamentos.length > 0 ? (
                        <span style={{ color: "var(--color-ok)" }}>Em dia</span>
                      ) : (
                        <span style={{ color: "var(--color-ink-soft)" }}>Sem cobranças</span>
                      )}
                      {encerrado && <StatusBadge status="encerrado" />}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <Button type="button" onClick={() => setContratoAbertoId(String(contrato.id))}>
                      Cobrança
                    </Button>
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <Card className="text-center py-10">
            <p style={{ color: "var(--color-ink-soft)" }}>
              {contratos.length === 0
                ? "Nenhum contrato cadastrado ainda."
                : "Nenhum inquilino encontrado com os filtros atuais."}
            </p>
          </Card>
        )}
      </div>

        </>
      )}

      {recebendo && recebimentoInfo && (
        <div
          className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(31, 42, 36, 0.55)" }}
          onClick={() => setRecebendo(null)}
        >
          <div
            className="modal-card w-full max-w-md rounded-lg border p-6"
            style={{
              background: "var(--color-card-bg)",
              borderColor: "var(--color-line)",
              boxShadow: "0 24px 48px -12px rgba(31, 42, 36, 0.35)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
              Receber pagamento
            </h3>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
              {recebimentoInfo.inquilino} · {recebimentoInfo.competencia} · saldo de R$ {recebimentoInfo.saldo.toFixed(2)}
            </p>
            <form action={receber} className="mt-4 grid grid-cols-1 gap-3">
              <input type="hidden" name="id" value={recebendo.id} />
              <Field
                label="Valor recebido (R$)"
                autoFocus
                name="valor_pago"
                type="number"
                step="0.01"
                required
                defaultValue={recebimentoInfo.saldo.toFixed(2)}
              />
              <Select label="Forma de pagamento" name="forma_pagamento" defaultValue="PIX" options={FORMAS_PAGAMENTO} />
              <Field label="Data do pagamento" name="data_pagamento" type="date" required defaultValue={hojeBrasil()} />
              <Field label="Observação (opcional)" name="observacoes" placeholder="Ex: entrada parcial" />
              <div className="flex justify-end gap-2 mt-1">
                <Button variant="ghost" type="button" onClick={() => setRecebendo(null)}>
                  Cancelar
                </Button>
                <BotaoConfirmarRecebimento />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
