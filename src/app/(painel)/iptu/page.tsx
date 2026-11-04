"use client";

import { createClient } from "@/lib/supabase/client";
import { Button, Card, Money, PageHeader, StatusBadge, Table } from "@/components/ui";
import { FormIptu } from "./form-iptu";
import { FiltrosPeriodo } from "../filtros-periodo";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Registro = Record<string, any>;

function mesCompetenciaAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function subtrairMeses(base: string, quantidade: number) {
  const [ano, mes] = base.split("-").map(Number);
  const data = new Date(ano, mes - 1 - quantidade, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function mesValido(valor: unknown) {
  return typeof valor === "string" && /^\d{4}-\d{2}$/.test(valor) ? valor : null;
}

function noPeriodo(competencia: string | null | undefined, de: string, ate: string) {
  const comp = String(competencia || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(comp)) return false;
  return comp >= de && comp <= ate;
}

function formatarData(valor: string | null | undefined) {
  if (!valor) return "—";
  const [ano, mes, dia] = valor.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarCompetencia(valor: string | null | undefined) {
  const comp = String(valor || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(comp)) return "—";
  const [ano, mes] = comp.split("-");
  return `${mes}/${ano}`;
}

function rotuloImovel(imovel: Registro | null | undefined) {
  if (!imovel) return "—";
  const partes = [imovel.logradouro, imovel.numero, imovel.bairro].filter(Boolean);
  return partes.length ? partes.join(", ") : imovel.codigo || "—";
}

function LinhaVazia({ colunas, mensagem }: { colunas: number; mensagem: string }) {
  return (
    <tr>
      <td className="px-4 py-6 text-center" colSpan={colunas} style={{ color: "var(--color-ink-soft)" }}>
        {mensagem}
      </td>
    </tr>
  );
}

export default function IptuPage() {
  const searchParams = useSearchParams();
  const [iptus, setIptus] = useState<Registro[]>([]);
  const [imoveis, setImoveis] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  const tipoParam = searchParams.get("tipo") || "";
  const tipo = ["recebimentos", "inadimplencia", "imoveis", "contratos", "contas", "manutencoes", "iptu"].includes(tipoParam) ? tipoParam : "iptu";
  const usaPeriodo = ["recebimentos", "inadimplencia", "contas", "manutencoes", "iptu"].includes(tipo);

  const atual = mesCompetenciaAtual();
  const de = mesValido(searchParams.get("de")) ?? subtrairMeses(atual, 11);
  const ate = mesValido(searchParams.get("ate")) ?? atual;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();

      const { data: imoveisData } = await supabase
        .from("imoveis")
        .select("id, codigo, logradouro, numero, complemento, bairro, cidade, uf, cep, tipo, finalidade, status, area_total, area_util, valor_aluguel, valor_condominio, iptu_mensal, matricula, matricula_agua, matricula_luz, observacoes, proprietarios(nome)")
        .order("codigo", { ascending: true });
      setImoveis((imoveisData ?? []) as Registro[]);

      if (tipo === "iptu") {
        const { data } = await supabase
          .from("iptu")
          .select(`
            id, imovel_id, ano, parcela, total_parcelas, valor_total, valor_parcela, data_vencimento, data_pagamento, valor_pago, desconto, multa_juros, status, forma_pagamento, comprovante_url, observacoes,
            imoveis ( id, codigo, logradouro, numero, complemento, bairro, cidade, uf, cep, tipo, finalidade, status, area_total, area_util, valor_aluguel, valor_condominio, iptu_mensal, matricula, matricula_agua, matricula_luz, observacoes, proprietarios(nome) )
          `)
          .order("ano", { ascending: false })
          .order("parcela", { ascending: true });
        const filtered = ((data ?? []) as Registro[]).filter((p) => noPeriodo(p.ano.toString(), de, ate));
        setIptus(filtered);
      }

      setLoading(false);
    }

    fetchData();
  }, [tipo, de, ate]);

  let titulo = "";
  let resumo: { rotulo: string; valor: React.ReactNode }[] = [];
  let cabecalho: string[] = [];
  let linhas: React.ReactNode[] = [];

  if (tipo === "iptu") {
    titulo = "Controle de IPTU";
    const pagos = iptus.filter((p) => p.status === "pago");
    const pendentes = iptus.filter((p) => p.status === "pendente");
    const atrasados = iptus.filter((p) => p.status === "atrasado");
    const isentos = iptus.filter((p) => p.status === "isento");
    const cancelados = iptus.filter((p) => p.status === "cancelado");

    resumo = [
      { rotulo: "Total de Parcelas", valor: String(iptus.length) },
      { rotulo: "Pagas", valor: String(pagos.length) },
      { rotulo: "Pendentes", valor: String(pendentes.length) },
      { rotulo: "Atrasadas", valor: String(atrasados.length) },
      { rotulo: "Isentas", valor: String(isentos.length) },
      { rotulo: "Canceladas", valor: String(cancelados.length) },
      { rotulo: "Valor Total", valor: <Money value={iptus.reduce((acc, p) => acc + Number(p.valor_parcela || 0), 0)} /> },
      { rotulo: "Valor Pago", valor: <Money value={iptus.reduce((acc, p) => acc + Number(p.valor_pago || 0), 0)} /> },
      { rotulo: "A Receber", valor: <Money value={iptus.filter(p => p.status !== "pago" && p.status !== "cancelado" && p.status !== "isento").reduce((acc, p) => acc + Number(p.valor_parcela || 0), 0)} /> },
    ];
    cabecalho = ["Ano", "Parcela", "Vencimento", "Pagamento", "Imóvel", "Valor Parcela", "Pago", "Desconto", "Multa/Juros", "Status", "Ações"];
    linhas =
      iptus.length === 0 ? (
        [<LinhaVazia key="vazio" colunas={11} mensagem="Nenhuma parcela de IPTU no período." />]
      ) : (
        iptus.map((p) => (
          <tr key={p.id} style={{ borderTop: "1px solid var(--color-line)" }}>
            <td className="px-4 py-2.5 whitespace-nowrap">{p.ano}</td>
            <td className="px-4 py-2.5 whitespace-nowrap">{p.parcela}/{p.total_parcelas}</td>
            <td className="px-4 py-2.5 whitespace-nowrap">{formatarData(p.data_vencimento)}</td>
            <td className="px-4 py-2.5 whitespace-nowrap">{formatarData(p.data_pagamento)}</td>
            <td className="px-4 py-2.5">{rotuloImovel(p.imoveis)}</td>
            <td className="px-4 py-2.5 whitespace-nowrap"><Money value={p.valor_parcela} /></td>
            <td className="px-4 py-2.5 whitespace-nowrap">{p.valor_pago > 0 ? <Money value={p.valor_pago} /> : "—"}</td>
            <td className="px-4 py-2.5 whitespace-nowrap">{p.desconto > 0 ? <Money value={p.desconto} /> : "—"}</td>
            <td className="px-4 py-2.5 whitespace-nowrap">{p.multa_juros > 0 ? <Money value={p.multa_juros} /> : "—"}</td>
            <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
            <td className="px-4 py-2.5 whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <a
                  href={`/iptu/${p.id}`}
                  className="rounded-sm border px-3 py-1.5 text-sm font-medium"
                  style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
                >
                  Ver
                </a>
              </div>
            </td>
          </tr>
        ))
      );
  }

  const periodo = searchParams.get("periodo") || "mes";

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Controle de IPTU"
          subtitle="Gerenciamento de pagamentos de IPTU por imóvel"
        />
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controle de IPTU"
        subtitle="Gerenciamento de pagamentos de IPTU por imóvel"
      />

      <FiltrosPeriodo
        periodo={periodo}
        rotulo={periodo ? (["mes", "3m", "6m", "ano", "tudo"].includes(periodo) ? (periodo === "mes" ? "Este mês" : periodo === "3m" ? "Últimos 3 meses" : periodo === "6m" ? "Últimos 6 meses" : periodo === "ano" ? `Ano ${new Date().getFullYear()}` : "Todo o histórico") : `Personalizado: ${searchParams.get("de") || ""} a ${searchParams.get("ate") || ""}`) : "Este mês"}
        de={searchParams.get("de") || ""}
        ate={searchParams.get("ate") || ""}
      />

      <div className="space-y-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
                Controle de IPTU
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                Gerenciamento de pagamentos de IPTU por imóvel
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FormIptu imoveis={imoveis} iptu={null} />
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
              <div className="rounded-sm border px-3 py-2" style={{ borderColor: "var(--color-line)" }}>
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
                  Total de Parcelas
                </span>
                <p className="mt-1 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
                  {iptus.length}
                </p>
              </div>
              <div className="rounded-sm border px-3 py-2" style={{ borderColor: "var(--color-line)" }}>
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
                  Pagas
                </span>
                <p className="mt-1 text-base font-semibold" style={{ color: "var(--color-ok)" }}>
                  {iptus.filter(p => p.status === "pago").length}
                </p>
              </div>
              <div className="rounded-sm border px-3 py-2" style={{ borderColor: "var(--color-line)" }}>
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
                  Pendentes
                </span>
                <p className="mt-1 text-base font-semibold" style={{ color: "var(--color-warn)" }}>
                  {iptus.filter(p => p.status === "pendente").length}
                </p>
              </div>
              <div className="rounded-sm border px-3 py-2" style={{ borderColor: "var(--color-line)" }}>
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
                  Atrasadas
                </span>
                <p className="mt-1 text-base font-semibold" style={{ color: "var(--color-alert)" }}>
                  {iptus.filter(p => p.status === "atrasado").length}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
              <div className="rounded-sm border px-3 py-2" style={{ borderColor: "var(--color-line)" }}>
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
                  Isentas
                </span>
                <p className="mt-1 text-base font-semibold" style={{ color: "var(--color-ink-soft)" }}>
                  {iptus.filter(p => p.status === "isento").length}
                </p>
              </div>
              <div className="rounded-sm border px-3 py-2" style={{ borderColor: "var(--color-line)" }}>
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
                  Canceladas
                </span>
                <p className="mt-1 text-base font-semibold" style={{ color: "var(--color-ink-soft)" }}>
                  {iptus.filter(p => p.status === "cancelado").length}
                </p>
              </div>
              <div className="rounded-sm border px-3 py-2" style={{ borderColor: "var(--color-line)" }}>
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
                  Valor Total
                </span>
                <p className="mt-1 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
                  <Money value={iptus.reduce((acc, p) => acc + Number(p.valor_parcela || 0), 0)} />
                </p>
              </div>
              <div className="rounded-sm border px-3 py-2" style={{ borderColor: "var(--color-line)" }}>
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
                  Valor Pago
                </span>
                <p className="mt-1 text-base font-semibold" style={{ color: "var(--color-ok)" }}>
                  <Money value={iptus.reduce((acc, p) => acc + Number(p.valor_pago || 0), 0)} />
                </p>
              </div>
              <div className="rounded-sm border px-3 py-2" style={{ borderColor: "var(--color-line)" }}>
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
                  A Receber
                </span>
                <p className="mt-1 text-base font-semibold" style={{ color: "var(--color-warn)" }}>
                  <Money value={iptus.filter(p => p.status !== "pago" && p.status !== "cancelado" && p.status !== "isento").reduce((acc, p) => acc + Number(p.valor_parcela || 0), 0)} />
                </p>
              </div>
            </div>

            <div className="mt-4">
              <Table head={["Ano", "Parcela", "Vencimento", "Pagamento", "Imóvel", "Valor Parcela", "Pago", "Desconto", "Multa/Juros", "Status", "Ações"]}>
                {iptus.length === 0 ? (
                  <LinhaVazia key="vazio" colunas={11} mensagem="Nenhuma parcela de IPTU no período." />
                ) : (
                  iptus.map((p) => (
                    <tr key={p.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                      <td className="px-4 py-2.5 whitespace-nowrap">{p.ano}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{p.parcela}/{p.total_parcelas}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{formatarData(p.data_vencimento)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{formatarData(p.data_pagamento)}</td>
                      <td className="px-4 py-2.5">{rotuloImovel(p.imoveis)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap"><Money value={p.valor_parcela} /></td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{p.valor_pago > 0 ? <Money value={p.valor_pago} /> : "—"}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{p.desconto > 0 ? <Money value={p.desconto} /> : "—"}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{p.multa_juros > 0 ? <Money value={p.multa_juros} /> : "—"}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`/iptu/${p.id}`}
                            className="rounded-sm border px-3 py-1.5 text-sm font-medium"
                            style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
                          >
                            Ver
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}