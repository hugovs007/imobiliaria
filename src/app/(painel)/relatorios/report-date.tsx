"use client";

import { useEffect, useState } from "react";

/**
 * Exibe a data/hora atual no cliente (evita mismatch de hidratação
 * entre servidor e navegador em relatórios impressos).
 */
export function ReportDate({ className }: { className?: string }) {
  const [dataAtual, setDataAtual] = useState<string | null>(null);

  useEffect(() => {
    setDataAtual(
      new Date().toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, []);

  if (!dataAtual) return null;

  return <span className={className}>{dataAtual}</span>;
}
