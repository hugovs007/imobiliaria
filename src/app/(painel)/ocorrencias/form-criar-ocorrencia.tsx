"use client";

import { useRef, useState } from "react";
import { Button, Field, Select, TextArea } from "@/components/ui";
import { criarOcorrencia } from "./actions";

const TIPOS_OCORRENCIA = [
  { value: "manutencao", label: "Manutenção" },
  { value: "reclamacao", label: "Reclamação" },
  { value: "atraso_pagamento", label: "Atraso de pagamento" },
  { value: "vizinhanca", label: "Vizinhança" },
  { value: "outro", label: "Outro" },
];

const GRAVIDADES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

interface FormCriarOcorrenciaProps {
  contratos: { id: string; codigo: string | null; inquilino: string | null; imovel: string | null }[];
  imoveis: { id: string; endereco: string }[];
}

export function FormCriarOcorrencia({ contratos, imoveis }: FormCriarOcorrenciaProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function handleClose() {
    dialogRef.current?.close();
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setIsPending(true);
    setError(null);

    try {
      const formData = new FormData(form);
      const res = await criarOcorrencia(formData);

      if (res?.error) {
        setError(res.error);
        return;
      }

      form.reset();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar a ocorrência.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={handleOpen}>+ Nova ocorrência</Button>

      <dialog
        ref={dialogRef}
        onClose={handleClose}
        className="m-auto max-h-[90vh] w-[min(50rem,calc(100vw-2rem))] overflow-y-auto rounded-md border bg-white p-0 shadow-2xl backdrop:bg-black/50"
        style={{ borderColor: "var(--color-line)" }}
      >
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
                Registrar ocorrência
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                Documente eventos e solicitações relacionadas a contratos e imóveis.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fechar"
              className="rounded-sm px-2 py-1 text-lg leading-none cursor-pointer"
              style={{ color: "var(--color-ink-soft)" }}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {error && (
              <div className="sm:col-span-2 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <Select
              label="Contrato (opcional)"
              name="contrato_id"
              options={[
                { value: "", label: "— sem contrato vinculado —" },
                ...contratos.map((c) => ({
                  value: c.id,
                  label: `${c.codigo ?? "s/ código"} — ${c.inquilino ?? "s/ inquilino"}${c.imovel ? ` (${c.imovel})` : ""}`,
                })),
              ]}
            />
            <Select
              label="Imóvel (opcional)"
              name="imovel_id"
              options={[
                { value: "", label: "— sem imóvel vinculado —" },
                ...imoveis.map((i) => ({ value: i.id, label: i.endereco })),
              ]}
            />
            <Select label="Tipo" name="tipo" defaultValue="outro" options={TIPOS_OCORRENCIA} />
            <Select label="Gravidade" name="gravidade" defaultValue="media" options={GRAVIDADES} />
            <Field label="Data da ocorrência" name="data_ocorrencia" type="date" />
            <div />
            <TextArea
              label="Descrição"
              name="descricao"
              required
              className="sm:col-span-2"
              placeholder="Descreva o ocorrido, solicitações do inquilino ou qualquer registro relevante..."
            />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isPending}>{isPending ? "Registrando..." : "Registrar ocorrência"}</Button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
