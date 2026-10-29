"use client";

import { Button } from "@/components/ui";
import { exportToCSV } from "./export-utils";

interface RelatorioAcoesProps {
  titulo: string;
  subtitle: string;
  tipo: string;
  headers: string[];
  rows: string[][];
  summary: { label: string; value: string }[];
}

/**
 * Botões de ação do relatório (Exportar CSV / Imprimir).
 * Client component: usa eventos de clique, window.print() e download de arquivo —
 * não pode ser renderizado dentro de um Server Component.
 */
export function RelatorioAcoes({ titulo, subtitle, tipo, headers, rows, summary }: RelatorioAcoesProps) {
  return (
    <>
      <Button
        variant="ghost"
        type="button"
        onClick={async () => {
          const today = new Date().toISOString().slice(0, 10);
          await exportToCSV({ title: titulo, subtitle, headers, rows, summary }, `relatorio-${tipo}-${today}`);
        }}
        className="print:hidden"
      >
        Exportar CSV
      </Button>
      <Button variant="ghost" type="button" onClick={() => window.print()} className="print:hidden">
        Imprimir / PDF
      </Button>
    </>
  );
}
