"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Card, Money, PageHeader, StatusBadge, Table, Button } from "@/components/ui";
import { FiltrosRelatorio } from "./filtros-relatorio";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

type Registro = Record<string, any>;

const TIPOS_VALIDOS = ["recebimentos", "inadimplencia", "imoveis", "contratos", "contas", "manutencoes"];
const TIPOS_COM_PERIODO = ["recebimentos", "inadimplencia", "contas", "manutencoes"];

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

const classeLinha = "border-b last:border-b-0";
const estiloLinha = { borderColor: "var(--color-line)" };
const classeCelula = "px-4 py-2.5";

interface RelatorioData {
  tipo: string;
  titulo: string;
  usaPeriodo: boolean;
  de: string;
  ate: string;
  resumo: { rotulo: string; valor: ReactNode }[];
  cabecalho: string[];
  linhas: ReactNode[];
  // Raw data for export
  rawData: {
    headers: string[];
    rows: (string | number)[][];
    summary: { label: string; value: string | number }[];
  };
}

function RelatorioContent({ data }: { data: RelatorioData }) {
  const { tipo, titulo, usaPeriodo, de, ate, resumo, cabecalho, linhas, rawData } = data;

  const handleExportCSV = () => {
    const csvContent = [
      titulo,
      usaPeriodo ? `Período: ${formatarCompetencia(de)} a ${formatarCompetencia(ate)}` : "Posição atual da carteira",
      "",
      rawData.headers.join(","),
      ...rawData.rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      "",
      "Resumo",
      ...rawData.summary.map(s => `${s.label},${s.value}`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `relatorio-${new Date().toISOString().slice(0,10)}.csv`);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    const wsData = [
      [titulo],
      [new Date().toLocaleDateString("pt-BR")],
      [],
      rawData.headers,
      ...rawData.rows,
      [],
      ["Resumo"],
      ...rawData.summary.map(s => [s.label, s.value])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = rawData.headers.map(() => ({ wch: 20 }));
    ws["!cols"] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `relatorio-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Emita relatórios por tipo e período; use a impressão do navegador para gerar o PDF"
      />

      <FiltrosRelatorio tipo={tipo} de={de} ate={ate} usaPeriodo={usaPeriodo} />

      <Card className="print:border-0 print:p-0">
        <header
          className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b pb-4"
          style={{ borderColor: "var(--color-line)" }}
        >
          <div>
            <h2 className="font-serif text-xl font-semibold" style={{ color: "var(--color-ink)" }}>
              {titulo}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
              {usaPeriodo
                ? `Período: ${formatarCompetencia(de)} a ${formatarCompetencia(ate)}`
                : "Posição atual da carteira"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
              Emitido em {new Date().toLocaleDateString("pt-BR")}
            </p>
            <button
              type="button"
              onClick={handleExportCSV}
              className="rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors print:hidden"
              style={{
                borderColor: "var(--color-line)",
                background: "transparent",
                color: "var(--color-ink-soft)",
              }}
            >
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors print:hidden"
              style={{
                borderColor: "var(--color-line)",
                background: "transparent",
                color: "var(--color-ink-soft)",
              }}
            >
              Exportar Excel
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-sm px-4 py-2 text-sm font-medium print:hidden"
              style={{ background: "var(--color-teal)", color: "var(--color-paper)" }}
            >
              Imprimir / PDF
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {resumo.map((item) => (
            <div
              key={item.rotulo}
              className="rounded-sm border px-3 py-2"
              style={{ borderColor: "var(--color-line)" }}
            >
              <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
                {item.rotulo}
              </span>
              <p className="mt-1 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
                {item.valor}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <Table head={cabecalho}>{linhas}</Table>
        </div>

        <footer
          className="mt-4 border-t pt-3 text-xs"
          style={{ borderColor: "var(--color-line)", color: "var(--color-ink-soft)" }}
        >
          Documento gerado pelo sistema de Gestão de Aluguéis · {new Date().toLocaleDateString("pt-BR")}
        </footer>
      </Card>
    </div>
  );
}

export default RelatorioContent;