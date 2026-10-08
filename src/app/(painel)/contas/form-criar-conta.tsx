"use client";

import { useRef, useState } from "react";
import { Button, Field, Select } from "@/components/ui";
import { criarConta } from "./actions";
import { SeletorImovelContas } from "./seletor-imovel-contas";

interface ImovelConta {
  id: string;
  label: string;
  matricula_agua: string | null;
  matricula_luz: string | null;
}

export function FormCriarConta({ imoveis }: { imoveis: ImovelConta[] }) {
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
      const res = await criarConta(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      form.reset();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cadastrar a conta.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={handleOpen}>
        + Nova conta
      </Button>
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
                Cadastrar conta
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                Controle de consumo por imóvel.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fechar"
              className="cursor-pointer rounded-sm px-2 py-1 text-lg leading-none"
              style={{ color: "var(--color-ink-soft)" }}
            >
              ×
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {error && (
              <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">
                {error}
              </div>
            )}
            <div className="sm:col-span-2">
              <SeletorImovelContas imoveis={imoveis} />
            </div>
            <Select
              label="Tipo"
              name="tipo"
              defaultValue="agua"
              options={[
                { value: "agua", label: "Água" },
                { value: "energia", label: "Energia" },
                { value: "outra", label: "Outra" },
              ]}
            />
            <Field label="Competência (mês)" name="competencia" type="month" required />
            <Field label="Valor (R$)" name="valor" type="number" step="0.01" required />
            <Select
              label="Responsável pelo pagamento"
              name="responsavel"
              defaultValue="proprietario"
              options={[
                { value: "proprietario", label: "Proprietário" },
                { value: "inquilino", label: "Inquilino" },
              ]}
            />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Registrando..." : "Registrar conta"}
              </Button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
