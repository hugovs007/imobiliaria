"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Alert, Button, Card, Field, Input, Money, PageHeader, Select, StatusBadge, Table } from "@/components/ui";
import { atualizarAtrasados, excluirPagamento, lancarCobranca, lancarCobrancasEmLote, marcarIsento, registrarPagamento } from "./actions";

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

function formatarDataSegura(dataRaw: string | null | undefined, opcoes?: Intl.DateTimeFormatOptions): string {
  if (!dataRaw) return "—";
  try {
    const dataObj = new Date(dataRaw);
    if (isNaN(dataObj.getTime())) return "—";
    return dataObj.toLocaleDateString("pt-BR", opcoes);
  } catch {
    return "—";
  }
}

function calcularIdentificacaoParcela(contrato: any, competencia: string): string {
  if (!contrato?.data_inicio || !contrato?.data_fim || !competencia) return "—";
  try {
    const dataInicio = new Date(contrato.data_inicio);
    const dataFim = new Date(contrato.data_fim);
    const dataCompetencia = new Date(competencia);

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

const HOJE = new Date().toISOString().split("T")[0];
const MES_ATUAL = new Date().toISOString().slice(0, 7);

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
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroCompetencia, setFiltroCompetencia] = useState("todas");
  const [recebendo, setRecebendo] = useState<any | null>(null);

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

  const competencias = useMemo(() => {
    const meses = new Set(
      pagamentos.map((p) => String(p.competencia || "").slice(0, 7)).filter(Boolean)
    );
    return Array.from(meses).sort().reverse();
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

  const opcoesContrato = useMemo(
    () =>
      contratos
        .filter((c) => c.ativo !== false)
        .map((c) => ({
          value: String(c.id),
          label: `${c.codigo || c.codigo_contrato || c.id.slice(0, 8)} — ${c.inquilinos?.nome || "Inquilino"} — R$ ${Number(c.valor_aluguel || 0).toFixed(2)}`,
        })),
    [contratos]
  );

  const pagamentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const lista = pagamentos.filter((p) => {
      const contrato = Array.isArray(p.contratos) ? p.contratos[0] : p.contratos;
      if (termo) {
        const texto = `${contrato?.inquilinos?.nome || ""} ${formatarEnderecoImovel(contrato?.imoveis)} ${contrato?.codigo || ""}`.toLowerCase();
        if (!texto.includes(termo)) return false;
      }
      if (filtroStatus !== "todos" && p.status !== filtroStatus) return false;
      if (filtroCompetencia !== "todas" && String(p.competencia || "").slice(0, 7) !== filtroCompetencia) return false;
      return true;
    });

    const ordem: Record<string, number> = { atrasado: 0, pendente: 1, isento: 2, pago: 3 };
    return lista.sort((a, b) => {
      const prioridadeA = ordem[a.status] ?? 2;
      const prioridadeB = ordem[b.status] ?? 2;
      if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;
      if (prioridadeA <= 1) return String(a.data_vencimento || "").localeCompare(String(b.data_vencimento || ""));
      return String(b.competencia || "").localeCompare(String(a.competencia || ""));
    });
  }, [pagamentos, busca, filtroStatus, filtroCompetencia]);

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="Pagamentos" subtitle="Cobranças mensais dos contratos, recebimentos e recibos." />
        <form action={atualizarAtrasados} className="mt-1">
          <Button variant="ghost">Atualizar atrasados</Button>
        </form>
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
            <span style={{ color: "var(--color-ink-soft)" }}>Status</span>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="atrasado">Atrasado</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="isento">Isento</option>
            </select>
          </label>
          <label className="flex w-44 flex-col gap-1 text-sm">
            <span style={{ color: "var(--color-ink-soft)" }}>Competência</span>
            <select value={filtroCompetencia} onChange={(e) => setFiltroCompetencia(e.target.value)}>
              <option value="todas">Todas</option>
              {competencias.map((c) => (
                <option key={c} value={c}>
                  {formatarDataSegura(`${c}-01`, { month: "2-digit", year: "numeric" })}
                </option>
              ))}
            </select>
          </label>
        </div>

        {pagamentosFiltrados.length > 0 ? (
          <Table head={["Inquilino / Imóvel", "Competência", "Vencimento", "Valor", "Pago", "Saldo", "Status", "Ações"]}>
            {pagamentosFiltrados.map((p) => {
              const contrato = Array.isArray(p.contratos) ? p.contratos[0] : p.contratos;
              const imovel = contrato?.imoveis;
              const inquilino = contrato?.inquilinos;
              const valorBase = Number(p.valor_base || 0);
              const valorPago = Number(p.valor_pago || 0);
              const saldo = Math.max(0, valorBase - valorPago);
              const podeReceber = saldo > 0.009 && p.status !== "isento";
              const parcela = calcularIdentificacaoParcela(contrato, p.competencia);

              return (
                <tr key={p.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{inquilino?.nome || "—"}</div>
                    <div className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                      {formatarEnderecoImovel(imovel)}
                    </div>
                  </td>
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
              );
            })}
          </Table>
        ) : (
          <Card className="text-center py-10">
            <p style={{ color: "var(--color-ink-soft)" }}>
              {pagamentos.length === 0
                ? "Nenhuma cobrança lançada ainda. Use as ações abaixo para gerar as cobranças do mês."
                : "Nenhuma cobrança encontrada com os filtros atuais."}
            </p>
          </Card>
        )}
      </div>

      <h3 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>
        Lançar cobranças
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h4 className="font-medium" style={{ color: "var(--color-ink)" }}>
            Gerar cobranças do mês
          </h4>
          <p className="mt-1 mb-4 text-xs" style={{ color: "var(--color-ink-soft)" }}>
            Cria uma cobrança para cada contrato ativo, com o valor do aluguel e o vencimento do próprio contrato.
          </p>
          <form action={lancarCobrancasEmLote} className="flex flex-wrap items-end gap-3">
            <Field label="Competência (mês)" name="competencia" type="month" required defaultValue={MES_ATUAL} />
            <Button>Gerar cobranças</Button>
          </form>
        </Card>
        <Card>
          <h4 className="font-medium" style={{ color: "var(--color-ink)" }}>
            Lançar cobrança avulsa
          </h4>
          <p className="mt-1 mb-4 text-xs" style={{ color: "var(--color-ink-soft)" }}>
            Para um contrato específico, quando a cobrança do mês não foi gerada em lote.
          </p>
          <form action={lancarCobranca} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label="Contrato" name="contrato_id" required options={opcoesContrato} className="sm:col-span-2" />
            <Field label="Competência (mês)" name="competencia" type="month" required />
            <Field label="Valor base (opcional)" name="valor_base" type="number" step="0.01" placeholder="Valor do aluguel" />
            <Field label="Vencimento (opcional)" name="data_vencimento" type="date" />
            <div className="sm:col-span-2">
              <Button>Lançar cobrança</Button>
            </div>
          </form>
        </Card>
      </div>

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
              <Field label="Data do pagamento" name="data_pagamento" type="date" required defaultValue={HOJE} />
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
