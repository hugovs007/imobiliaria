"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TIPOS = [
  { valor: "recebimentos", rotulo: "Recebimentos" },
  { valor: "inadimplencia", rotulo: "Inadimplência" },
  { valor: "imoveis", rotulo: "Imóveis" },
  { valor: "contratos", rotulo: "Contratos ativos" },
  { valor: "contas", rotulo: "Contas de consumo" },
  { valor: "manutencoes", rotulo: "Manutenções" },
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
  const [inicio, setInicio] = useState(de);
  const [fim, setFim] = useState(ate);

  function aplicar(novoTipo: string, novoDe?: string, novoAte?: string) {
    const params = new URLSearchParams();
    params.set("tipo", novoTipo);
    const deEfetivo = novoDe || inicio;
    const ateEfetivo = novoAte || fim;
    if (deEfetivo) params.set("de", deEfetivo);
    if (ateEfetivo) params.set("ate", ateEfetivo);
    router.push(`/relatorios?${params.toString()}`, { scroll: false });
  }

  return (
    <div
      className="space-y-3 rounded-md border px-4 py-3 print:hidden"
      style={{ borderColor: "var(--color-line)", background: "var(--color-card-bg)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Relatório
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {TIPOS.map((t) => {
              const ativo = tipo === t.valor;
              return (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => aplicar(t.valor)}
                  className="rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    borderColor: ativo ? "var(--color-teal)" : "var(--color-line)",
                    background: ativo ? "var(--color-teal)" : "transparent",
                    color: ativo ? "var(--color-paper)" : "var(--color-ink-soft)",
                  }}
                >
                  {t.rotulo}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-sm px-4 py-2 text-sm font-medium"
          style={{ background: "var(--color-teal)", color: "var(--color-paper)" }}
        >
          Imprimir relatório
        </button>
      </div>

      {usaPeriodo && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <input
              type="month"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              aria-label="Mês inicial"
              className="text-xs"
              style={{ width: "9rem" }}
            />
            <span className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
              até
            </span>
            <input
              type="month"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              aria-label="Mês final"
              className="text-xs"
              style={{ width: "9rem" }}
            />
          </div>
          <button
            type="button"
            onClick={() => aplicar(tipo)}
            className="rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              borderColor: "var(--color-line)",
              background: "transparent",
              color: "var(--color-ink-soft)",
            }}
          >
            Aplicar período
          </button>
        </div>
      )}
    </div>
  );
}
