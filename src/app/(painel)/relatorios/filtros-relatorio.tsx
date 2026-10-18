"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TIPOS = [
  { value: "recebimentos", label: "Recebimentos" },
  { value: "inadimplencia", label: "Inadimplência" },
  { value: "informe", label: "Informe de rendimentos" },
  { value: "imoveis", label: "Imóveis" },
  { value: "contratos", label: "Contratos ativos" },
  { value: "contas", label: "Contas de consumo" },
  { value: "manutencoes", label: "Manutenções" },
];

export function FiltrosRelatorio({
  tipo,
  de,
  ate,
  usaPeriodo,
}: {
  tipo: string;
  de: string;
  ate: string;
  usaPeriodo: boolean;
}) {
  const router = useRouter();
  const [tipoSelecionado, setTipoSelecionado] = useState(tipo);
  const [deSelecionado, setDeSelecionado] = useState(de);
  const [ateSelecionado, setAteSelecionado] = useState(ate);

  function aplicar() {
    const params = new URLSearchParams();
    params.set("tipo", tipoSelecionado);
    if (usaPeriodo) {
      params.set("de", deSelecionado);
      params.set("ate", ateSelecionado);
    }
    router.push(`/relatorios?${params.toString()}`);
  }

  return (
    <div
      className="flex flex-wrap items-end gap-3 rounded-md border p-4 print:hidden"
      style={{ borderColor: "var(--color-line)", backgroundColor: "var(--color-card-bg)" }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
          Tipo de relatório
        </span>
        <select
          value={tipoSelecionado}
          onChange={(e) => setTipoSelecionado(e.target.value)}
          className="rounded-sm border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {usaPeriodo && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
              De (competência)
            </span>
            <input
              type="month"
              value={deSelecionado}
              onChange={(e) => setDeSelecionado(e.target.value)}
              className="rounded-sm border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
              Até (competência)
            </span>
            <input
              type="month"
              value={ateSelecionado}
              onChange={(e) => setAteSelecionado(e.target.value)}
              className="rounded-sm border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
            />
          </label>
        </>
      )}

      <button
        type="button"
        onClick={aplicar}
        className="rounded-sm px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
        style={{ background: "var(--color-teal)", color: "var(--color-paper)" }}
      >
        Aplicar
      </button>
    </div>
  );
}
