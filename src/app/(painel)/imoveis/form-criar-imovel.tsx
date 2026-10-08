"use client";

import { useRef, useState } from "react";
import { Button, Field, Select, TextArea } from "@/components/ui";
import { criarImovel } from "./actions";
import { FINALIDADES, STATUS_IMOVEL, TIPOS_IMOVEL } from "./opcoes";

interface FormCriarImovelProps {
  proprietarios: { id: string; nome: string }[];
}

export function FormCriarImovel({ proprietarios }: FormCriarImovelProps) {
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
      const res = await criarImovel(formData);

      if (res?.error) {
        setError(res.error);
        return;
      }

      form.reset();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cadastrar o imóvel.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={handleOpen}>+ Novo imóvel</Button>

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
                Cadastrar imóvel
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                Preencha os dados da carteira de imóveis administrados.
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

            <Field label="Código interno" name="codigo" placeholder="IM-0001" required />
            <Select
              label="Proprietário"
              name="proprietario_id"
              options={[{ value: "", label: "— não vinculado —" }, ...proprietarios.map((p) => ({ value: p.id, label: p.nome }))]}
            />
            <Select
              label="Tipo de Imóvel"
              name="tipo"
              defaultValue="Residencial"
              options={TIPOS_IMOVEL}
            />
            <Select
              label="Finalidade"
              name="finalidade"
              defaultValue="Residencial"
              options={FINALIDADES}
            />
            <Select
              label="Status"
              name="status"
              defaultValue="Disponível"
              options={STATUS_IMOVEL}
            />
            <Field label="CEP" name="cep" />
            <Field label="Logradouro" name="logradouro" required />
            <Field label="Número" name="numero" />
            <Field label="Complemento" name="complemento" placeholder="Apto, bloco, casa dos fundos..." />
            <Field label="Bairro" name="bairro" />
            <Field label="Cidade" name="cidade" required />
            <Field label="UF" name="uf" required />
            <Field label="Área Total (m²)" name="area_total" type="number" step="0.01" />
            <Field label="Área Útil (m²)" name="area_util" type="number" step="0.01" />
            <Field label="Valor Aluguel (R$)" name="valor_aluguel" type="number" step="0.01" required />
            <Field label="Valor Condomínio (R$)" name="valor_condominio" type="number" step="0.01" />
            <Field label="IPTU Mensal (R$)" name="iptu_mensal" type="number" step="0.01" />
            <Field label="Matrícula" name="matricula" placeholder="Número da matrícula do imóvel" />
            <Field label="Matrícula da companhia de água" name="matricula_agua" placeholder="Ex: CAGEPA — nº da matrícula" />
            <Field label="Matrícula da companhia de energia" name="matricula_luz" placeholder="Ex: Neoenergia — nº da matrícula" />
            <TextArea label="Observações" name="observacoes" className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isPending}>{isPending ? "Cadastrando..." : "Cadastrar imóvel"}</Button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
