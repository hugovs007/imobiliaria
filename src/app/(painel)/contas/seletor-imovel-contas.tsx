"use client";

import { useState } from "react";

interface ImovelConta {
  id: string;
  label: string;
  matricula_agua: string | null;
  matricula_luz: string | null;
}

export function SeletorImovelContas({ imoveis }: { imoveis: ImovelConta[] }) {
  const [imovelId, setImovelId] = useState("");
  const imovelSelecionado = imoveis.find((i) => i.id === imovelId) ?? null;

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label className="flex flex-col gap-1 text-sm">
        <span style={{ color: "var(--color-ink-soft)" }}>
          Imóvel<span style={{ color: "var(--color-alert)" }}> *</span>
        </span>
        <select
          name="imovel_id"
          required
          value={imovelId}
          onChange={(e) => setImovelId(e.target.value)}
        >
          <option value="">— selecione um imóvel —</option>
          {imoveis.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </label>

      {imovelSelecionado && (
        <div
          className="flex flex-col gap-1 rounded-sm border p-3 text-xs"
          style={{ borderColor: "var(--color-line)", color: "var(--color-ink-soft)" }}
        >
          <p>
            <strong style={{ color: "var(--color-ink)" }}>Matrícula da companhia de água:</strong>{" "}
            {imovelSelecionado.matricula_agua || "não cadastrada"}
          </p>
          <p>
            <strong style={{ color: "var(--color-ink)" }}>Matrícula da companhia de energia:</strong>{" "}
            {imovelSelecionado.matricula_luz || "não cadastrada"}
          </p>
        </div>
      )}
    </div>
  );
}
