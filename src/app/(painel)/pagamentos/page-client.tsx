"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, Money, PageHeader, Select, StatusBadge, Table, Alert, Input } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { lancarCobranca, lancarCobrancasEmLote, registrarPagamento, marcarIsento, excluirPagamento, atualizarAtrasados } from "./actions";

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

// ============================================
// TENANT PAYMENT SUMMARY - Agrupa pagamentos por inquilino
// ============================================

interface TenantPaymentSummary {
  inquilinoId: string;
  inquilinoNome: string;
  inquilinoTelefone: string;
  contratos: {
    id: string;
    codigo: string;
    imovel: any;
    valorAluguel: number;
    pagamentos: any[];
  }[];
  totalDevido: number;
  totalPago: number;
  totalPendente: number;
  parcelasPagas: number;
  parcelasPendentes: number;
  parcelasAtrasadas: number;
  statusGeral: 'em_dia' | 'com_pendencias' | 'atrasado' | 'isento';
}

function agruparPorInquilino(pagamentos: any[], contratos: any[]): TenantPaymentSummary[] {
  const mapaInquilinos = new Map<string, TenantPaymentSummary>();

  // Inicializar com contratos ativos
  contratos.filter(c => c.ativo !== false).forEach(contrato => {
    const inq = contrato.inquilinos;
    if (!inq) return;
    
    const key = inq.id;
    if (!mapaInquilinos.has(key)) {
      mapaInquilinos.set(key, {
        inquilinoId: inq.id,
        inquilinoNome: inq.nome,
        inquilinoTelefone: inq.telefone,
        contratos: [],
        totalDevido: 0,
        totalPago: 0,
        totalPendente: 0,
        parcelasPagas: 0,
        parcelasPendentes: 0,
        parcelasAtrasadas: 0,
        statusGeral: 'em_dia',
      });
    }
    
    const summary = mapaInquilinos.get(key)!;
    summary.contratos.push({
      id: contrato.id,
      codigo: contrato.codigo || contrato.codigo_contrato || contrato.id.slice(0, 8),
      imovel: contrato.imoveis,
      valorAluguel: Number(contrato.valor_aluguel || contrato.valor_atual || 0),
      pagamentos: [],
    });
  });

  // Agrupar pagamentos
  pagamentos.forEach(pagamento => {
    const contrato = Array.isArray(pagamento.contratos) ? pagamento.contratos[0] : pagamento.contratos;
    const inq = contrato?.inquilinos;
    if (!inq) return;

    const key = inq.id;
    const summary = mapaInquilinos.get(key);
    if (!summary) return;

    const contratoSummary = summary.contratos.find(c => c.id === contrato.id);
    if (contratoSummary) {
      contratoSummary.pagamentos.push(pagamento);
    }

    const valorBase = Number(pagamento.valor_base || 0);
    const valorPago = Number(pagamento.valor_pago || 0);
    const saldo = Math.max(0, valorBase - valorPago);

    summary.totalDevido += valorBase;
    summary.totalPago += valorPago;
    summary.totalPendente += saldo;

    if (pagamento.status === 'pago') summary.parcelasPagas++;
    else if (pagamento.status === 'atrasado') summary.parcelasAtrasadas++;
    else if (pagamento.status === 'pendente') summary.parcelasPendentes++;
  });

  // Calcular status geral
  mapaInquilinos.forEach(summary => {
    if (summary.parcelasAtrasadas > 0) summary.statusGeral = 'atrasado';
    else if (summary.parcelasPendentes > 0) summary.statusGeral = 'com_pendencias';
    else if (summary.parcelasPagas > 0 && summary.parcelasPendentes === 0 && summary.parcelasAtrasadas === 0) summary.statusGeral = 'em_dia';
    else summary.statusGeral = 'em_dia';
  });

  return Array.from(mapaInquilinos.values()).sort((a, b) => {
    // Ordenar: atrasados primeiro, depois com pendências, depois em dia
    const ordem = { atrasado: 0, com_pendencias: 1, em_dia: 2, isento: 3 };
    return ordem[a.statusGeral] - ordem[b.statusGeral];
  });
}

// ============================================
// COMPONENTES VISUAIS
// ============================================

function StatusIndicator({ status }: { status: TenantPaymentSummary['statusGeral'] }) {
  const configs = {
    em_dia: { label: 'Em dia', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '✅' },
    com_pendencias: { label: 'Pendências', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: '⏳' },
    atrasado: { label: 'Atrasado', color: 'bg-red-100 text-red-800 border-red-200', icon: '🔴' },
    isento: { label: 'Isento', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '🚫' },
  };
  const cfg = configs[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span>{cfg.icon}</span> {cfg.label}
    </span>
  );
}

function ProgressBar({ valor, total, cor = 'emerald' }: { valor: number; total: number; cor?: string }) {
  const pct = total > 0 ? Math.min(100, (valor / total) * 100) : 0;
  const cores = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
  };
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div 
        className={`${cores[cor as keyof typeof cores]} h-full rounded-full transition-all duration-300`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function TenantCard({ summary, onExpand }: { summary: TenantPaymentSummary; onExpand: (id: string) => void }) {
  const pctPago = summary.totalDevido > 0 ? (summary.totalPago / summary.totalDevido) * 100 : 100;
  const corProgresso = summary.statusGeral === 'atrasado' ? 'red' : summary.statusGeral === 'com_pendencias' ? 'amber' : 'emerald';

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-lg hover:border-emerald-200"
      onClick={() => onExpand(summary.inquilinoId)}
      style={{ 
        borderLeft: `4px solid ${summary.statusGeral === 'atrasado' ? '#ef4444' : summary.statusGeral === 'com_pendencias' ? '#f59e0b' : '#10b981'}`,
        background: summary.statusGeral === 'atrasado' ? '#fef2f2' : summary.statusGeral === 'com_pendencias' ? '#fffbeb' : '#f0fdf4'
      }}
    >
      <div className="p-4">
        {/* Header do Inquilino */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-lg truncate" style={{ color: 'var(--color-ink)' }}>
                {summary.inquilinoNome}
              </h4>
              <StatusIndicator status={summary.statusGeral} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              <span>📞 {summary.inquilinoTelefone || '—'}</span>
              <span>📋 {summary.contratos.length} contrato(s)</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onExpand(summary.inquilinoId); }}>
            Ver detalhes →
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: 'var(--color-ink-soft)' }}>Progresso do pagamento</span>
            <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>
              {pctPago.toFixed(0)}%
            </span>
          </div>
          <ProgressBar valor={summary.totalPago} total={summary.totalDevido} cor={corProgresso} />
        </div>

        {/* Valores Resumidos */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-bold text-red-600"><Money value={summary.totalDevido} /></div>
            <div style={{ color: 'var(--color-ink-soft)' }}>Total Devido</div>
          </div>
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-bold text-emerald-600"><Money value={summary.totalPago} /></div>
            <div style={{ color: 'var(--color-ink-soft)' }}>Total Pago</div>
          </div>
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-bold text-amber-600"><Money value={summary.totalPendente} /></div>
            <div style={{ color: 'var(--color-ink-soft)' }}>A Receber</div>
          </div>
        </div>

        {/* Contadores de Parcelas */}
        <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: 'var(--color-ink-soft)' }}>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {summary.parcelasPagas} pagas
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> {summary.parcelasPendentes} pendentes
          </span>
          {summary.parcelasAtrasadas > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> {summary.parcelasAtrasadas} atrasadas
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function TenantDetailModal({ 
  summary, 
  onClose, 
  onRegistrarPagamento 
}: { 
  summary: TenantPaymentSummary | null; 
  onClose: () => void; 
  onRegistrarPagamento: (pagamentoId: string) => void;
}) {
  if (!summary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-bold text-lg">{summary.inquilinoNome}</h3>
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              {summary.contratos.length} contrato(s) • 📞 {summary.inquilinoTelefone || '—'}
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>✕ Fechar</Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {summary.contratos.map(contrato => (
            <div key={contrato.id} className="mb-6 p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold">Contrato: {contrato.codigo}</h4>
                  <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
                    📍 {formatarEnderecoImovel(contrato.imovel)} • 💰 Aluguel: <Money value={contrato.valorAluguel} />
                  </p>
                </div>
                <StatusIndicator status={contrato.pagamentos.some(p => p.status === 'atrasado') ? 'atrasado' : 
                  contrato.pagamentos.some(p => p.status === 'pendente') ? 'com_pendencias' : 'em_dia'} />
              </div>

              {/* Tabela de parcelas do contrato */}
              <Table head={["Parcela", "Competência", "Vencimento", "Valor", "Pago", "Saldo", "Status", "Ações"]}>
                {contrato.pagamentos
                  .sort((a, b) => new Date(a.competencia).getTime() - new Date(b.competencia).getTime())
                  .map(p => {
                    const valorBase = Number(p.valor_base || 0);
                    const valorPago = Number(p.valor_pago || 0);
                    const saldo = Math.max(0, valorBase - valorPago);
                    const isPendente = p.status === 'pendente' || p.status === 'atrasado';
                    const parcelaId = calcularIdentificacaoParcela({ 
                      data_inicio: contrato.pagamentos[0]?.contratos?.[0]?.data_inicio, 
                      data_fim: contrato.pagamentos[0]?.contratos?.[0]?.data_fim 
                    }, p.competencia);

                    return (
                      <tr key={p.id} className={p.status === 'atrasado' ? 'bg-red-50' : p.status === 'pendente' ? 'bg-amber-50' : ''}>
                        <td className="px-3 py-2 font-mono text-sm">{parcelaId}</td>
                        <td className="px-3 py-2 text-sm">{formatarDataSegura(p.competencia, { month: '2-digit', year: 'numeric' })}</td>
                        <td className="px-3 py-2 text-sm">{formatarDataSegura(p.data_vencimento)}</td>
                        <td className="px-3 py-2 text-sm"><Money value={valorBase} /></td>
                        <td className="px-3 py-2 text-sm font-medium text-emerald-600">{valorPago > 0 ? <Money value={valorPago} /> : '—'}</td>
                        <td className="px-3 py-2 text-sm">
                          {saldo > 0.009 ? (
                            <span className="font-bold text-amber-700"><Money value={saldo} /></span>
                          ) : (
                            <span className="text-emerald-700 font-semibold">Quitado</span>
                          )}
                        </td>
                        <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                        <td className="px-3 py-2">
                          {isPendente && (
                            <Button 
                              variant="primary" 
                              size="sm" 
                              onClick={() => { onRegistrarPagamento(p.id); onClose(); }}
                            >
                              💳 Receber
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </Table>
              
              {contrato.pagamentos.length === 0 && (
                <p className="text-center text-sm py-4" style={{ color: 'var(--color-ink-soft)' }}>
                  Nenhuma parcela lançada para este contrato
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function PagamentosPage({ 
  initialPagamentos = [], 
  initialContratos = [] 
}: { 
  initialPagamentos?: any[]; 
  initialContratos?: any[]; 
}) {
  const [pagamentos, setPagamentos] = useState<any[]>(initialPagamentos);
  const [contratos, setContratos] = useState<any[]>(initialContratos);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const summaries = useMemo(() => agruparPorInquilino(pagamentos, contratos), [pagamentos, contratos]);
  const filteredSummaries = useMemo(() => 
    summaries.filter(s => 
      s.inquilinoNome.toLowerCase().includes(searchTerm.toLowerCase())
    ), [summaries, searchTerm]);

  const stats = useMemo(() => ({
    total: pagamentos.length,
    pagos: pagamentos.filter((p) => p.status === "pago").length,
    pendentes: pagamentos.filter((p) => p.status === "pendente").length,
    atrasados: pagamentos.filter((p) => p.status === "atrasado").length,
    isentos: pagamentos.filter((p) => p.status === "isento").length,
    valorTotalDevido: pagamentos.reduce((sum, p) => sum + Number(p.valor_base || 0), 0),
    valorTotalPago: pagamentos.reduce((sum, p) => sum + Number(p.valor_pago || 0), 0),
    valorTotalPendente: pagamentos
      .filter((p) => p.status !== "pago" && p.status !== "isento")
      .reduce((sum, p) => sum + Number(p.valor_base || 0) - Number(p.valor_pago || 0), 0),
  }), [pagamentos]);

  const handleOpenTenant = (inquilinoId: string) => {
    setSelectedTenant(inquilinoId);
  };

  const handleRegistrarPagamento = (pagamentoId: string) => {
    // Redirecionar para o formulário de pagamento com o ID pré-selecionado
    const url = new URL(window.location.href);
    url.searchParams.set('pagamento_id', pagamentoId);
    window.location.href = url.toString();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <PageHeader title="PDV — Recebimento e Caixa" subtitle="Lançamento de movimentações financeiras, caixa e impressão de recibos." />
        <form action={atualizarAtrasados}>
          <Button variant="ghost">🔄 Atualizar status de atrasados</Button>
        </form>
      </div>

      {/* Cards de Estatísticas Globais */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7 mb-6">
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
            {stats.total}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Total de parcelas</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ok)" }}>
            {stats.pagos}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Pagos</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-warn)" }}>
            {stats.pendentes}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Pendentes</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-alert)" }}>
            {stats.atrasados}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Atrasados</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink-soft)" }}>
            {stats.isentos}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Isentos</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
            <Money value={stats.valorTotalPendente} />
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>A receber</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ok)" }}>
            <Money value={stats.valorTotalPago} />
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Caixa recebido</div>
        </Card>
      </div>

      {/* NOVA VISÃO: Dashboard por Inquilino */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
            📊 Visão por Inquilino ({filteredSummaries.length} inquilinos)
          </h3>
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Buscar inquilino..." 
              className="w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSummaries.map(summary => (
            <TenantCard 
              key={summary.inquilinoId} 
              summary={summary} 
              onExpand={handleOpenTenant} 
            />
          ))}
        </div>

        {filteredSummaries.length === 0 && (
          <Card className="text-center py-12">
            <p style={{ color: 'var(--color-ink-soft)' }}>
              {searchTerm ? 'Nenhum inquilino encontrado com esse nome.' : 'Nenhum inquilino com contratos ativos encontrado.'}
            </p>
          </Card>
        )}
      </div>

      {/* Modal de Detalhes do Inquilino */}
      {selectedTenant && (
        <TenantDetailModal 
          summary={summaries.find(s => s.inquilinoId === selectedTenant) || null}
          onClose={() => setSelectedTenant(null)}
          onRegistrarPagamento={handleRegistrarPagamento}
        />
      )}

      {/* Painel Superior do PDV (mantido) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
        <Card>
          <div className="p-1">
            <h3 className="mb-3 font-semibold text-emerald-800 flex items-center gap-1.5">
              💳 Lançar Entrada PDV (Recebimento)
            </h3>
            {pagamentos.filter((p) => {
              const vBase = Number(p.valor_base || 0);
              const vPago = Number(p.valor_pago || 0);
              return (vBase - vPago) > 0.009 && p.status !== "isento";
            }).length > 0 ? (
              <form action={registrarPagamento} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Select
                    label="Selecione o Contrato / Parcela em Aberto"
                    name="id"
                    required
                    options={pagamentos
                      .filter((p) => {
                        const vBase = Number(p.valor_base || 0);
                        const vPago = Number(p.valor_pago || 0);
                        return (vBase - vPago) > 0.009 && p.status !== "isento";
                      })
                      .map((p) => {
                        const c = Array.isArray(p.contratos) ? p.contratos[0] : p.contratos;
                        const inq = c?.inquilinos?.nome || "Inquilino";
                        const saldo = Math.max(0, Number(p.valor_base || 0) - Number(p.valor_pago || 0));
                        const comp = formatarDataSegura(p.competencia, { month: "2-digit", year: "numeric" });
                        const parcStr = calcularIdentificacaoParcela(c, p.competencia);
                        return {
                          value: String(p.id),
                          label: `Parcela ${parcStr} — ${comp} — ${c?.codigo || c?.codigo_contrato || c?.id?.slice(0, 6)} — ${inq} (Saldo: R$ ${saldo.toFixed(2)})`,
                        };
                      })}
                  />
                </div>
                <Field label="Valor Recebido (R$)" name="valor_pago" type="number" step="0.01" required placeholder="0.00" />
                <Select
                  label="Forma de Pagamento"
                  name="forma_pagamento"
                  defaultValue="PIX"
                  options={[
                    { value: "PIX", label: "PIX" },
                    { value: "Dinheiro", label: "Dinheiro" },
                    { value: "Cartão de Débito", label: "Cartão de Débito" },
                    { value: "Cartão de Crédito", label: "Cartão de Crédito" },
                    { value: "Transferência Bancária", label: "Transferência" },
                  ]}
                />
                <Field label="Data do Pagamento" name="data_pagamento" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
                <Field label="Observação (opcional)" name="observacoes" placeholder="Ex: Entrada 1/2" />
                <div className="sm:col-span-2 mt-1">
                  <Button variant="primary">Confirmar e Gerar Recibo</Button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-gray-500 py-6 text-center">Nenhum débito ou parcela pendente no momento.</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-medium" style={{ color: "var(--color-ink)" }}>Lançar cobranças em lote</h3>
          <form action={lancarCobrancasEmLote} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Competência (mês)" name="competencia" type="month" required defaultValue={new Date().toISOString().slice(0, 7)} />
            <Field label="Dia de vencimento padrão" name="dia_vencimento" type="number" defaultValue={10} step="1" required />
            <div className="sm:col-span-2">
              <p className="text-xs mb-3" style={{ color: "var(--color-ink-soft)" }}>
                Gera cobranças mensais para todos os contratos ativos com o valor do aluguel.
              </p>
              <Button variant="ghost">Gerar cobranças do mês</Button>
            </div>
          </form>
        </Card>

        <Card>
          <h3 className="mb-3 font-medium" style={{ color: "var(--color-ink)" }}>Lançar cobrança avulsa</h3>
          <form action={lancarCobranca} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Contrato"
              name="contrato_id"
              required
              options={contratos.filter((c) => c.ativo !== false).map((c) => ({
                value: String(c.id),
                label: `${c.codigo || c.codigo_contrato || c.id.slice(0, 8)} — R$ ${Number(c.valor_aluguel || 0).toFixed(2)} — ${(c.inquilinos as any)?.nome || "Inquilino"}`,
              }))}
            />
            <Field label="Competência (mês)" name="competencia" type="month" required />
            <Field label="Valor base (opcional)" name="valor_base" type="number" step="0.01" placeholder="Automático" />
            <Field label="Vencimento (opcional)" name="data_vencimento" type="date" />
            <div className="sm:col-span-2">
              <Button variant="ghost">Lançar cobrança</Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Tabela de Histórico Completa (mantida para referência) */}
      <div className="mt-8">
        <h3 className="text-base font-semibold mb-3 text-gray-800">Histórico Completo de Movimentações e Caixa</h3>
        <Table head={["Parcela", "Competência", "Contrato / Imóvel", "Inquilino", "Valor aluguel", "Total pago", "Saldo a pagar", "Status", "Entradas / Recibos Emitidos", "Ações"]}>
          {(pagamentos ?? []).map((p) => {
            const contrato = Array.isArray(p.contratos) ? p.contratos[0] : p.contratos;
            const imovel = contrato?.imoveis;
            const inquilino = contrato?.inquilinos;

            const valorBase = Number(p.valor_base || 0);
            const valorPago = Number(p.valor_pago || 0);
            const saldoRestante = Math.max(0, valorBase - valorPago);

            const isPendente = p.status === "pendente" || p.status === "atrasado";
            const movimentacoes: any[] = Array.isArray(p.movimentacoes_pagamento) ? p.movimentacoes_pagamento : [];
            const parcelaIdentificacao = calcularIdentificacaoParcela(contrato, p.competencia);

            return (
              <tr key={p.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                <td className="px-4 py-2.5 whitespace-nowrap font-bold text-emerald-700">
                  {parcelaIdentificacao}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap font-medium">
                  {formatarDataSegura(p.competencia, { month: "2-digit", year: "numeric" })}
                </td>
                <td className="px-4 py-2.5 text-xs">
                  <div className="font-bold">{contrato?.codigo || contrato?.codigo_contrato || contrato?.id?.slice(0, 8) || "—"}</div>
                  <div className="text-gray-500">{formatarEnderecoImovel(imovel)}</div>
                </td>
                <td className="px-4 py-2.5 text-xs font-medium">
                  {inquilino?.nome || "—"}
                </td>
                <td className="px-4 py-2.5 font-semibold">
                  <Money value={valorBase} />
                </td>
                <td className="px-4 py-2.5 font-medium text-emerald-600">
                  {valorPago > 0 ? <Money value={valorPago} /> : "—"}
                </td>
                <td className="px-4 py-2.5">
                  {saldoRestante > 0.009 ? (
                    <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <Money value={saldoRestante} />
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-semibold">R$ 0,00 (Quitado)</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {movimentacoes.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {movimentacoes.map((mov) => (
                        <div key={mov.id} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 border rounded text-xs">
                          <div>
                            <span className="font-bold text-emerald-700">R$ {Number(mov.valor_pago).toFixed(2)}</span>
                            <span className="text-gray-500 ml-1">({mov.forma_pagamento || "PIX"})</span>
                            <span className="text-gray-400 block text-[10px]">{formatarDataSegura(mov.data_pagamento)} — Resta: R$ {Number(mov.saldo_restante).toFixed(2)}</span>
                          </div>
                          <Link
                            href={`/recibos/${mov.id}?tipo=movimentacao`}
                            target="_blank"
                            className="bg-teal-600 hover:bg-teal-700 text-white font-medium px-2 py-1 rounded text-[11px] whitespace-nowrap inline-flex items-center gap-1"
                          >
                            🖨️ Recibo
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Nenhuma entrada lançada</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    {isPendente && (
                      <form action={marcarIsento} className="inline">
                        <input type="hidden" name="id" value={String(p.id)} />
                        <Button variant="ghost">Isentar</Button>
                      </form>
                    )}
                    <RecordEditor
                      entity="pagamentos"
                      id={String(p.id)}
                      fields={[
                        { name: "competencia", label: "Competência", value: p.competencia ? String(p.competencia).slice(0, 7) : "", type: "month", required: true },
                        { name: "valor_base", label: "Valor aluguel (R$)", value: valorBase, type: "number", step: "0.01", required: true },
                        { name: "valor_pago", label: "Valor pago (R$)", value: valorPago, type: "number", step: "0.01" },
                        { name: "data_vencimento", label: "Vencimento", value: p.data_vencimento, type: "date", required: true },
                        { name: "data_pagamento", label: "Data do pagamento", value: p.data_pagamento, type: "date" },
                        {
                          name: "status",
                          label: "Status",
                          kind: "select",
                          value: p.status,
                          options: [
                            { value: "pendente", label: "Pendente" },
                            { value: "pago", label: "Pago" },
                            { value: "atrasado", label: "Atrasado" },
                            { value: "isento", label: "Isento" },
                          ],
                        },
                      ]}
                    />
                    {isPendente && (
                      <form action={excluirPagamento} className="inline">
                        <input type="hidden" name="id" value={String(p.id)} />
                        <Button variant="ghost">Excluir</Button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>

        {pagamentos.length === 0 && (
          <div className="mt-8 text-center py-12" style={{ color: "var(--color-ink-soft)" }}>
            Nenhum lançamento no caixa.
          </div>
        )}
      </div>
    </div>
  );
}
  const supabase = await createClient();

  let pagamentos: any[] = [];
  let contratos: any[] = [];
  let error: string | null = null;

  try {
    const [{ data: pagamentosData, error: pagamentosError }, { data: contratosData, error: contratosError }] = await Promise.all([
      supabase
        .from("pagamentos")
        .select(
          `
          *,
          contratos (
            *,
            imoveis (*),
            inquilinos (*)
          ),
          movimentacoes_pagamento (*)
        `
        )
        .order("competencia", { ascending: false }),

      supabase
        .from("contratos")
        .select(`
          *,
          imoveis (*),
          inquilinos (*)
        `)
        .eq("ativo", true),
    ]);

    if (pagamentosError) throw pagamentosError;
    if (contratosError) throw contratosError;

    pagamentos = pagamentosData ?? [];
    contratos = contratosData ?? [];
  } catch (err: any) {
    console.error("Erro ao carregar pagamentos:", err);
    error = err.message || "Erro ao carregar dados do banco de dados.";
  }

  const contratosVigentes = contratos.filter((c) => c.ativo !== false);

  const cobrancasAbertas = pagamentos.filter((p) => {
    const vBase = Number(p.valor_base || 0);
    const vPago = Number(p.valor_pago || 0);
    return (vBase - vPago) > 0.009 && p.status !== "isento";
  });

  const stats = {
    total: pagamentos.length,
    pagos: pagamentos.filter((p) => p.status === "pago").length,
    pendentes: pagamentos.filter((p) => p.status === "pendente").length,
    atrasados: pagamentos.filter((p) => p.status === "atrasado").length,
    isentos: pagamentos.filter((p) => p.status === "isento").length,
    valorTotalDevido: pagamentos.reduce((sum, p) => sum + Number(p.valor_base || 0), 0),
    valorTotalPago: pagamentos.reduce((sum, p) => sum + Number(p.valor_pago || 0), 0),
    valorTotalPendente: pagamentos
      .filter((p) => p.status !== "pago" && p.status !== "isento")
      .reduce((sum, p) => sum + Number(p.valor_base || 0) - Number(p.valor_pago || 0), 0),
  };

  if (error) {
    return (
      <div>
        <PageHeader title="PDV — Recebimento e Caixa" subtitle="Lançamento de movimentações financeiras e recibos." />
        <Alert variant="destructive" className="mt-4">
          <strong>Erro ao carregar dados:</strong> {error}
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <PageHeader title="PDV — Recebimento e Caixa" subtitle="Lançamento de movimentações financeiras, caixa e impressão de recibos." />
        <form action={atualizarAtrasados}>
          <Button variant="ghost">🔄 Atualizar status de atrasados</Button>
        </form>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7 mb-6">
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
            {stats.total}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Total de parcelas</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ok)" }}>
            {stats.pagos}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Pagos</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-warn)" }}>
            {stats.pendentes}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Pendentes</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-alert)" }}>
            {stats.atrasados}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Atrasados</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink-soft)" }}>
            {stats.isentos}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Isentos</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
            <Money value={stats.valorTotalPendente} />
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>A receber</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ok)" }}>
            <Money value={stats.valorTotalPago} />
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Caixa recebido</div>
        </Card>
      </div>

      {/* Painel Superior do PDV */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
        
        {/* 1. Lançar Entrada PDV */}
        <Card>
          <div className="p-1">
            <h3 className="mb-3 font-semibold text-emerald-800 flex items-center gap-1.5">
              💳 Lançar Entrada PDV (Recebimento)
            </h3>
            {cobrancasAbertas.length > 0 ? (
              <form action={registrarPagamento} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Select
                    label="Selecione o Contrato / Parcela em Aberto"
                    name="id"
                    required
                    options={cobrancasAbertas.map((p) => {
                      const c = Array.isArray(p.contratos) ? p.contratos[0] : p.contratos;
                      const inq = c?.inquilinos?.nome || "Inquilino";
                      const saldo = Math.max(0, Number(p.valor_base || 0) - Number(p.valor_pago || 0));
                      const comp = formatarDataSegura(p.competencia, { month: "2-digit", year: "numeric" });
                      const parcStr = calcularIdentificacaoParcela(c, p.competencia);
                      return {
                        value: String(p.id),
                        label: `Parcela ${parcStr} — ${comp} — ${c?.codigo || c?.codigo_contrato || c?.id?.slice(0, 6)} — ${inq} (Saldo: R$ ${saldo.toFixed(2)})`,
                      };
                    })}
                  />
                </div>
                <Field label="Valor Recebido (R$)" name="valor_pago" type="number" step="0.01" required placeholder="0.00" />
                <Select
                  label="Forma de Pagamento"
                  name="forma_pagamento"
                  defaultValue="PIX"
                  options={[
                    { value: "PIX", label: "PIX" },
                    { value: "Dinheiro", label: "Dinheiro" },
                    { value: "Cartão de Débito", label: "Cartão de Débito" },
                    { value: "Cartão de Crédito", label: "Cartão de Crédito" },
                    { value: "Transferência Bancária", label: "Transferência" },
                  ]}
                />
                <Field label="Data do Pagamento" name="data_pagamento" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
                <Field label="Observação (opcional)" name="observacoes" placeholder="Ex: Entrada 1/2" />
                <div className="sm:col-span-2 mt-1">
                  <Button variant="primary">
                    Confirmar e Gerar Recibo
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-gray-500 py-6 text-center">Nenhum débito ou parcela pendente no momento.</p>
            )}
          </div>
        </Card>

        {/* 2. Lançar Cobranças em Lote */}
        <Card>
          <h3 className="mb-3 font-medium" style={{ color: "var(--color-ink)" }}>Lançar cobranças em lote</h3>
          <form action={lancarCobrancasEmLote} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Competência (mês)" name="competencia" type="month" required defaultValue={new Date().toISOString().slice(0, 7)} />
            <Field label="Dia de vencimento padrão" name="dia_vencimento" type="number" defaultValue={10} step="1" required />
            <div className="sm:col-span-2">
              <p className="text-xs mb-3" style={{ color: "var(--color-ink-soft)" }}>
                Gera cobranças mensais para todos os contratos ativos com o valor do aluguel.
              </p>
              <Button variant="ghost">Gerar cobranças do mês</Button>
            </div>
          </form>
        </Card>

        {/* 3. Lançar Cobrança Avulsa */}
        <Card>
          <h3 className="mb-3 font-medium" style={{ color: "var(--color-ink)" }}>Lançar cobrança avulsa</h3>
          <form action={lancarCobranca} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Contrato"
              name="contrato_id"
              required
              options={contratosVigentes.map((c) => ({
                value: String(c.id),
                label: `${c.codigo || c.codigo_contrato || c.id.slice(0, 8)} — R$ ${Number(c.valor_aluguel || 0).toFixed(2)} — ${(c.inquilinos as any)?.nome || "Inquilino"}`,
              }))}
            />
            <Field label="Competência (mês)" name="competencia" type="month" required />
            <Field label="Valor base (opcional)" name="valor_base" type="number" step="0.01" placeholder="Automático" />
            <Field label="Vencimento (opcional)" name="data_vencimento" type="date" />
            <div className="sm:col-span-2">
              <Button variant="ghost">Lançar cobrança</Button>
            </div>
          </form>
        </Card>

      </div>

      {/* Tabela de Histórico e Movimentações */}
      <div className="mt-8">
        <h3 className="text-base font-semibold mb-3 text-gray-800">Histórico de Movimentações e Caixa</h3>
        <Table head={["Parcela", "Competência", "Contrato / Imóvel", "Inquilino", "Valor aluguel", "Total pago", "Saldo a pagar", "Status", "Entradas / Recibos Emitidos", "Ações"]}>
          {(pagamentos ?? []).map((p) => {
            const contrato = Array.isArray(p.contratos) ? p.contratos[0] : p.contratos;
            const imovel = contrato?.imoveis;
            const inquilino = contrato?.inquilinos;

            const valorBase = Number(p.valor_base || 0);
            const valorPago = Number(p.valor_pago || 0);
            const saldoRestante = Math.max(0, valorBase - valorPago);

            const isPendente = p.status === "pendente" || p.status === "atrasado";
            const movimentacoes: any[] = Array.isArray(p.movimentacoes_pagamento) ? p.movimentacoes_pagamento : [];
            const parcelaIdentificacao = calcularIdentificacaoParcela(contrato, p.competencia);

            return (
              <tr key={p.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                <td className="px-4 py-2.5 whitespace-nowrap font-bold text-emerald-700">
                  {parcelaIdentificacao}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap font-medium">
                  {formatarDataSegura(p.competencia, { month: "2-digit", year: "numeric" })}
                </td>
                <td className="px-4 py-2.5 text-xs">
                  <div className="font-bold">{contrato?.codigo || contrato?.codigo_contrato || contrato?.id?.slice(0, 8) || "—"}</div>
                  <div className="text-gray-500">{formatarEnderecoImovel(imovel)}</div>
                </td>
                <td className="px-4 py-2.5 text-xs font-medium">
                  {inquilino?.nome || "—"}
                </td>
                <td className="px-4 py-2.5 font-semibold">
                  <Money value={valorBase} />
                </td>
                <td className="px-4 py-2.5 font-medium text-emerald-600">
                  {valorPago > 0 ? <Money value={valorPago} /> : "—"}
                </td>
                <td className="px-4 py-2.5">
                  {saldoRestante > 0.009 ? (
                    <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <Money value={saldoRestante} />
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-semibold">R$ 0,00 (Quitado)</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {movimentacoes.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {movimentacoes.map((mov) => (
                        <div key={mov.id} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 border rounded text-xs">
                          <div>
                            <span className="font-bold text-emerald-700">R$ {Number(mov.valor_pago).toFixed(2)}</span>
                            <span className="text-gray-500 ml-1">({mov.forma_pagamento || "PIX"})</span>
                            <span className="text-gray-400 block text-[10px]">{formatarDataSegura(mov.data_pagamento)} — Resta: R$ {Number(mov.saldo_restante).toFixed(2)}</span>
                          </div>
                          <Link
                            href={`/recibos/${mov.id}?tipo=movimentacao`}
                            target="_blank"
                            className="bg-teal-600 hover:bg-teal-700 text-white font-medium px-2 py-1 rounded text-[11px] whitespace-nowrap inline-flex items-center gap-1"
                          >
                            🖨️ Recibo
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Nenhuma entrada lançada</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    {/* Isentar */}
                    {isPendente && (
                      <form action={marcarIsento} className="inline">
                        <input type="hidden" name="id" value={String(p.id)} />
                        <Button variant="ghost">Isentar</Button>
                      </form>
                    )}

                    {/* Editor */}
                    <RecordEditor
                      entity="pagamentos"
                      id={String(p.id)}
                      fields={[
                        { name: "competencia", label: "Competência", value: p.competencia ? String(p.competencia).slice(0, 7) : "", type: "month", required: true },
                        { name: "valor_base", label: "Valor aluguel (R$)", value: valorBase, type: "number", step: "0.01", required: true },
                        { name: "valor_pago", label: "Valor pago (R$)", value: valorPago, type: "number", step: "0.01" },
                        { name: "data_vencimento", label: "Vencimento", value: p.data_vencimento, type: "date", required: true },
                        { name: "data_pagamento", label: "Data do pagamento", value: p.data_pagamento, type: "date" },
                        {
                          name: "status",
                          label: "Status",
                          kind: "select",
                          value: p.status,
                          options: [
                            { value: "pendente", label: "Pendente" },
                            { value: "pago", label: "Pago" },
                            { value: "atrasado", label: "Atrasado" },
                            { value: "isento", label: "Isento" },
                          ],
                        },
                      ]}
                    />

                    {/* Excluir */}
                    {isPendente && (
                      <form action={excluirPagamento} className="inline">
                        <input type="hidden" name="id" value={String(p.id)} />
                        <Button variant="ghost">Excluir</Button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>

        {pagamentos.length === 0 && (
          <div className="mt-8 text-center py-12" style={{ color: "var(--color-ink-soft)" }}>
            Nenhum lançamento no caixa.
          </div>
        )}
      </div>
    </div>
  );
}