"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";

const TIPOS = [
  { value: "recebimentos", label: "Recebimentos", usaPeriodo: true },
  { value: "inadimplencia", label: "Inadimplência", usaPeriodo: true },
  { value: "imoveis", label: "Imóveis", usaPeriodo: false },
  { value: "contratos", label: "Contratos", usaPeriodo: false },
  { value: "contas", label: "Contas de Consumo", usaPeriodo: true },
  { value: "manutencoes", label: "Manutenções", usaPeriodo: true },
] as const;

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
  const searchParams = useSearchParams();

  const handleTipoChange = (novoTipo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tipo", novoTipo);
    if (!TIPOS.find((t) => t.value === novoTipo)?.usaPeriodo) {
      params.delete("de");
      params.delete("ate");
    }
    router.push(`/relatorios?${params.toString()}`);
  };

  const handlePeriodoChange = (campo: "de" | "ate", valor: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) {
      params.set(campo, valor);
    } else {
      params.delete(campo);
    }
    router.push(`/relatorios?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-4 p-4 rounded-md border" style={{ borderColor: "var(--color-line)" }}>
      <div className="flex flex-col gap-1 min-w-[180px]">
        <label className="text-xs font-medium" style={{ color: "var(--color-ink-soft)" }}>
          Tipo de relatório
        </label>
        <select
          value={tipo}
          onChange={(e) => handleTipoChange(e.target.value)}
          className="rounded-sm border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-line)", background: "var(--color-card-bg)" }}
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {usaPeriodo && (
        <>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-xs font-medium" style={{ color: "var(--color-ink-soft)" }}>
              De (AAAA-MM)
            </label>
            <input
              type="month"
              value={de}
              onChange={(e) => handlePeriodoChange("de", e.target.value)}
              className="rounded-sm border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-line)", background: "var(--color-card-bg)" }}
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-xs font-medium" style={{ color: "var(--color-ink-soft)" }}>
              Até (AAAA-MM)
            </label>
            <input
              type="month"
              value={ate}
              onChange={(e) => handlePeriodoChange("ate", e.target.value)}
              className="rounded-sm border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-line)", background: "var(--color-card-bg)" }}
            />
          </div>
        </>
      )}

      <div className="ml-auto flex gap-2">
        <Button
          variant="ghost"
          type="button"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("de");
            params.delete("ate");
            router.push(`/relatorios?${params.toString()}`);
          }}
          disabled={!usaPeriodo || (!de && !ate)}
        >
          Limpar período
        </Button>
      </div>
    </div>
  );
}