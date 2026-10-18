"use client";

import { useRef, useState } from "react";
import { criarAditivo } from "./actions";
import { Button, Field, Select, TextArea } from "@/components/ui";

const TIPOS_ADTIIVO: { value: string; label: string }[] = [
  { value: "valor", label: "Reajuste/alteração de valor" },
  { value: "prazo", label: "Alteração de prazo" },
  { value: "clausula", label: "Alteração de cláusula" },
  { value: "outro", label: "Outro" },
];

export interface ContratoOpcao {
  id: string;
  codigo: string | null;
  inquilino: string | null;
  imovel: string | null;
  valorAtual: number | null;
  dataFim: string | null;
}

export function FormCriarAditivo({ contratos }: { contratos: ContratoOpcao[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function abrirDialog() {
    setError(null);
    dialogRef.current?.showModal();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const resultado = await criarAditivo(formData);

    if (resultado.error) {
      setError(resultado.error);
      setIsPending(false);
      return;
    }

    dialogRef.current?.close();
    setIsPending(false);
  }

  return (
    <>
      <Button type="button" onClick={abrirDialog}>
        + Novo aditivo
      </Button>
      <dialog
        ref={dialogRef}
        className="m-auto max-h-[90vh] w-[min(50rem,calc(100vw-2rem))] overflow-y-auto rounded-md border bg-white p-0 shadow-2xl backdrop:bg-black/50"
      >
        <div className="p-6">
          <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
            Novo aditivo contratual
          </h2>
          {error && (
            <div
              className="mb-4 rounded-md border p-3 text-sm"
              style={{ borderColor: "var(--color-alert)", color: "var(--color-alert)" }}
            >
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Contrato"
              name="contrato_id"
              required
              className="sm:col-span-2"
              options={[
                { value: "", label: "— selecione o contrato —" },
                ...contratos.map((c) => ({
                  value: c.id,
                  label: `${c.codigo ?? "s/ código"} — ${c.inquilino ?? "s/ inquilino"}${c.imovel ? ` (${c.imovel})` : ""}`,
                })),
              ]}
            />
            <Select label="Tipo" name="tipo" defaultValue="outro" options={TIPOS_ADTIIVO} />
            <Field label="Data de assinatura" name="data_assinatura" type="date" />
            <Field
              label="Valor anterior (R$)"
              name="valor_anterior"
              type="number"
              step="0.01"
              placeholder="0,00"
            />
            <Field
              label="Novo valor (R$)"
              name="valor_novo"
              type="number"
              step="0.01"
              placeholder="0,00"
            />
            <Field label="Nova data de fim" name="nova_data_fim" type="date" />
            <Field label="Documento (URL)" name="documento_url" placeholder="https://..." />
            <TextArea
              label="Descrição"
              name="descricao"
              required
              className="sm:col-span-2"
              placeholder="Descreva o que está sendo alterado no contrato..."
            />
            <label className="flex items-center gap-2 text-sm sm:col-span-2" style={{ color: "var(--color-ink)" }}>
              <input type="checkbox" name="aplicar_novo_valor" className="h-4 w-4" />
              Aplicar o novo valor ao contrato (atualiza o valor atual do aluguel)
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar aditivo"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => dialogRef.current?.close()}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
