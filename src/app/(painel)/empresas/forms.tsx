"use client";

import { useRef, useState } from "react";
import { Button, Field } from "@/components/ui";
import { criarEmpresa, criarAdminEmpresa } from "./actions";

interface EmpresaOpcao {
  id: string;
  nome: string;
}

export function FormCriarEmpresa() {
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
      const res = await criarEmpresa(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      form.reset();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a empresa.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={handleOpen}>
        + Nova empresa
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
                Criar empresa
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                Cada empresa é um locador isolado, com seus imóveis, contratos e recibos.
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
            <Field label="Nome / Razão social" name="nome" required />
            <Field label="CNPJ / CPF" name="cnpj_cpf" />
            <Field label="Cidade" name="cidade" />
            <Field label="UF" name="uf" />
            <Field label="Telefone" name="telefone" />
            <Field label="E-mail" name="email" type="email" />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Criando..." : "Criar empresa"}
              </Button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}

export function FormCriarAdminEmpresa({ empresas }: { empresas: EmpresaOpcao[] }) {
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
      const res = await criarAdminEmpresa(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      form.reset();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o administrador.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={handleOpen}>
        + Novo administrador
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
                Criar administrador da empresa
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                O administrador gerencia imóveis, inquilinos e contratos apenas da empresa dele.
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
            <div className="flex flex-col gap-1 text-sm sm:col-span-2">
              <label className="font-medium" style={{ color: "var(--color-ink)" }}>
                Empresa
              </label>
              <select
                name="empresa_id"
                required
                className="rounded border px-3 py-2 bg-white"
                style={{ borderColor: "var(--color-line)" }}
              >
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Nome do administrador" name="nome" required />
            <Field label="E-mail (login)" name="email" type="email" required />
            <Field label="Senha inicial" name="senha" type="password" required />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Criando..." : "Criar administrador"}
              </Button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
