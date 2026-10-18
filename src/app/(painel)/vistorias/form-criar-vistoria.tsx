"use client";

import { useRef, useState } from "react";
import { criarVistoria } from "./actions";
import { Button, Field, Select, TextArea } from "@/components/ui";

const TIPOS_VISTORIA = [
  { value: "entrada", label: "Entrada" },
  { value: "saida", label: "Saída" },
  { value: "periodica", label: "Periódica" },
];

interface Props {
  imoveis: { id: string; endereco: string }[];
  contratos: { id: string; codigo: string; inquilino: string | null; imovel: string | null }[];
}

export function FormCriarVistoria({ imoveis, contratos }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoje = new Date().toISOString().slice(0, 10);

  function handleOpen() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function handleClose() {
    dialogRef.current?.close();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setIsPending(true);
    setError(null);
    const res = await criarVistoria(formData);
    setIsPending(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    form.reset();
    handleClose();
  }

  return (
    <>
      <Button type="button" onClick={handleOpen}>
        Nova vistoria
      </Button>
      <dialog
        ref={dialogRef}
        className="m-auto max-h-[90vh] w-[min(50rem,calc(100vw-2rem))] overflow-y-auto rounded-md border bg-white p-0 shadow-2xl backdrop:bg-black/50"
        style={{ borderColor: "var(--color-line)" }}
      >
        <form onSubmit={handleSubmit} className="grid gap-4 p-6 sm:grid-cols-2">
          <h2
            className="sm:col-span-2 text-lg font-semibold"
            style={{ color: "var(--color-ink)" }}
          >
            Nova vistoria
          </h2>

          <Select
            label="Imóvel"
            name="imovel_id"
            required
            options={[
              { value: "", label: "Selecione o imóvel" },
              ...imoveis.map((i) => ({ value: i.id, label: i.endereco })),
            ]}
          />
          <Select
            label="Contrato (opcional)"
            name="contrato_id"
            options={[
              { value: "", label: "Sem contrato" },
              ...contratos.map((c) => ({
                value: c.id,
                label: `${c.codigo}${c.inquilino ? ` — ${c.inquilino}` : ""}${c.imovel ? ` (${c.imovel})` : ""}`,
              })),
            ]}
          />
          <Select label="Tipo" name="tipo" options={TIPOS_VISTORIA} defaultValue="entrada" />
          <Field label="Data da vistoria" name="data_vistoria" type="date" defaultValue={hoje} />
          <Field label="Vistoriador" name="vistoriador" placeholder="Nome de quem realizou a vistoria" />
          <TextArea
            label="Observações gerais"
            name="observacoes_gerais"
            placeholder="Anotações gerais sobre o estado do imóvel"
          />

          <p
            className="sm:col-span-2 text-xs"
            style={{ color: "var(--color-ink-soft)" }}
          >
            O checklist padrão de vistoria é criado automaticamente e pode ser ajustado item a
            item na página da vistoria.
          </p>

          {error && (
            <div className="sm:col-span-2 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button disabled={isPending}>
              {isPending ? "Salvando..." : "Criar vistoria"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
