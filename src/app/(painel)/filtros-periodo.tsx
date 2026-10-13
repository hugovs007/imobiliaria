"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useIsMobile } from "@/hooks/useMediaQuery";

const OPCOES = [
  { valor: "mes", rotulo: "Este mês" },
  { valor: "3m", rotulo: "Últimos 3 meses" },
  { valor: "6m", rotulo: "Últimos 6 meses" },
  { valor: "ano", rotulo: "Este ano" },
  { valor: "tudo", rotulo: "Tudo" },
];

export function FiltrosPeriodo({
  periodo,
  rotulo,
  de,
  ate,
}: {
  periodo: string;
  rotulo: string;
  de: string;
  ate: string;
}) {
  const router = useRouter();
  const [inicio, setInicio] = useState(de);
  const [fim, setFim] = useState(ate);
  const isMobile = useIsMobile();

  function aplicar(novoPeriodo: string, novoDe?: string, novoAte?: string) {
    const params = new URLSearchParams();
    params.set("periodo", novoPeriodo);
    if (novoPeriodo === "custom") {
      if (novoDe) params.set("de", novoDe);
      if (novoAte) params.set("ate", novoAte);
    }
    router.push(`/?${params.toString()}`, { scroll: false });
  }

  return (
    <div
      className={`rounded-md border px-4 py-3 print:hidden ${isMobile ? "space-y-4" : "flex flex-wrap items-center justify-between gap-3"}`}
      style={{ borderColor: "var(--color-line)", background: "var(--color-card-bg)" }}
    >
      <div className={`flex flex-wrap items-center gap-2 ${isMobile ? "flex-col items-stretch" : ""}`}>
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Período
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {OPCOES.map((opcao) => {
            const ativo = periodo === opcao.valor;
            return (
              <button
                key={opcao.valor}
                type="button"
                onClick={() => aplicar(opcao.valor)}
                className={`rounded-sm border px-3 py-2 text-sm font-medium transition-colors min-h-[44px] ${isMobile ? "flex-1 text-center" : ""}`}
                style={{
                  borderColor: ativo ? "var(--color-teal)" : "var(--color-line)",
                  background: ativo ? "var(--color-teal)" : "transparent",
                  color: ativo ? "var(--color-paper)" : "var(--color-ink-soft)",
                }}
              >
                {opcao.rotulo}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`flex flex-wrap items-center gap-2 ${isMobile ? "flex-col items-stretch" : ""}`}>
        <div className={`flex items-center gap-1.5 ${isMobile ? "flex-col items-stretch gap-2" : ""}`}>
          <div className={`flex items-center gap-1.5 ${isMobile ? "flex-col items-stretch gap-2 w-full" : ""}`}>
            <label className="text-xs font-medium" style={{ color: "var(--color-ink-soft)" }}>
              De
            </label>
            <input
              type="month"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              aria-label="Mês inicial"
              className={`text-sm min-h-[44px] ${isMobile ? "w-full" : ""}`}
              style={{ width: isMobile ? "100%" : "9rem" }}
            />
          </div>
          <div className={`flex items-center gap-1.5 ${isMobile ? "flex-col items-stretch gap-2 w-full" : ""}`}>
            <label className="text-xs font-medium" style={{ color: "var(--color-ink-soft)" }}>
              Até
            </label>
            <input
              type="month"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              aria-label="Mês final"
              className={`text-sm min-h-[44px] ${isMobile ? "w-full" : ""}`}
              style={{ width: isMobile ? "100%" : "9rem" }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => aplicar("custom", inicio, fim)}
          className={`rounded-sm border px-4 py-2 text-sm font-medium transition-colors min-h-[44px] ${isMobile ? "w-full" : ""}`}
          style={{
            borderColor: periodo === "custom" ? "var(--color-teal)" : "var(--color-line)",
            background: periodo === "custom" ? "var(--color-teal)" : "transparent",
            color: periodo === "custom" ? "var(--color-paper)" : "var(--color-ink-soft)",
          }}
        >
          Aplicar
        </button>
        <span className={`text-sm font-medium ${isMobile ? "text-center w-full" : ""}`} style={{ color: "var(--color-ink-soft)" }}>
          Exibindo: {rotulo}
        </span>
      </div>
    </div>
  );
}
