"use client";

import { useRef, useState } from "react";
import { Button, Field, TextArea } from "@/components/ui";
import { criarInquilino } from "./actions";

export function FormCriarInquilino() {
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
      const res = await criarInquilino(formData);

      if (res?.error) {
        setError(res.error);
        return;
      }

      form.reset();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cadastrar o inquilino.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={handleOpen}>+ Novo inquilino</Button>

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
                Cadastrar inquilino
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                Pessoas que ocupam os imóveis administrados.
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

            <Field label="Nome *" name="nome" required />
            <Field label="CPF/CNPJ" name="cpf_cnpj" />
            <Field label="Telefone" name="telefone" />
            <Field label="E-mail" name="email" type="email" />
            <TextArea label="Observações" name="observacoes" className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isPending}>{isPending ? "Cadastrando..." : "Cadastrar inquilino"}</Button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
