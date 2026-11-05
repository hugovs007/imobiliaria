"use client";

import { useRef, useState } from "react";
import { Button, Field, Select, TextArea } from "@/components/ui";
import { criarIptu, atualizarIptu } from "./actions";
import { STATUS_IPTU, FORMAS_PAGAMENTO_IPTU, MESES } from "./opcoes";

type Registro = Record<string, any>;

interface FormIptuProps {
  imoveis: Registro[];
  iptu?: {
    id: string;
    imovel_id: string;
    ano: number;
    parcela: number;
    total_parcelas: number;
    valor_total: number;
    valor_parcela: number;
    data_vencimento: string;
    data_pagamento: string | null;
    valor_pago: number;
    desconto: number;
    multa_juros: number;
    status: string;
    forma_pagamento: string | null;
    comprovante_url: string | null;
    observacoes: string | null;
  } | null;
}

export function FormIptu({ imoveis, iptu }: FormIptuProps) {
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
      const res = iptu ? await atualizarIptu(formData) : await criarIptu(formData);

      if (res?.error) {
        setError(res.error);
        return;
      }

      form.reset();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o IPTU.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={handleOpen}>+ Novo IPTU</Button>

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
                {iptu ? "Editar IPTU" : "Novo IPTU"}
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                {iptu ? "Editar parcela de IPTU" : "Cadastrar nova parcela de IPTU"}
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

          <form onSubmit={handleSubmit} encType="multipart/form-data" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {error && (
              <div className="sm:col-span-2 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <input type="hidden" name="id" value={iptu?.id || ""} />

            <Select
              label="Imóvel"
              name="imovel_id"
              required
              options={[
                { value: "", label: "— Selecione o imóvel —" },
                ...imoveis.map((i) => ({
                  value: i.id,
                  label: `${i.codigo} - ${i.logradouro}, ${i.numero} - ${i.bairro}, ${i.cidade}/${i.uf}`,
                })),
              ]}
            />

            <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Field label="Ano" name="ano" type="number" required defaultValue={new Date().getFullYear()} />
              <Field label="Parcela" name="parcela" type="number" required defaultValue={1} />
              <Field label="Total de Parcelas" name="total_parcelas" type="number" required defaultValue={1} />
              <Field label="Valor Total (R$)" name="valor_total" type="number" step="0.01" required placeholder="0,00" />
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Field label="Valor da Parcela (R$)" name="valor_parcela" type="number" step="0.01" required placeholder="0,00" />
              <Field label="Desconto (R$)" name="desconto" type="number" step="0.01" defaultValue={0} />
              <Field label="Multa/Juros (R$)" name="multa_juros" type="number" step="0.01" defaultValue={0} />
              <Field label="Valor Pago (R$)" name="valor_pago" type="number" step="0.01" defaultValue={0} />
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Field label="Data de Vencimento" name="data_vencimento" type="date" required />
              <Field label="Data do Pagamento" name="data_pagamento" type="date" />
              <Select
                label="Status"
                name="status"
                defaultValue="pendente"
                options={[
                  { value: "pendente", label: "Pendente" },
                  { value: "pago", label: "Pago" },
                  { value: "atrasado", label: "Atrasado" },
                  { value: "isento", label: "Isento" },
                  { value: "cancelado", label: "Cancelado" },
                ]}
              />
              <Select
                label="Forma de Pagamento"
                name="forma_pagamento"
                options={[
                  { value: "", label: "— não informado —" },
                  { value: "PIX", label: "PIX" },
                  { value: "Dinheiro", label: "Dinheiro" },
                  { value: "Cartão de Débito", label: "Cartão de Débito" },
                  { value: "Cartão de Crédito", label: "Cartão de Crédito" },
                  { value: "Transferência Bancária", label: "Transferência Bancária" },
                  { value: "Boleto", label: "Boleto" },
                  { value: "Outro", label: "Outro" },
                ]}
              />
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Comprovante (URL)" name="comprovante_url" type="url" placeholder="https://..." />
                          <label className="flex flex-col gap-1 text-sm">
                            <span style={{ color: "var(--color-ink-soft)" }}>Ou envie arquivo (PDF/Imagem)</span>
                            <input 
                              name="comprovante_file" 
                              type="file" 
                              accept=".pdf,.jpg,.jpeg,.png,.webp" 
                              className="text-sm" 
                            />
                            <span className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                              Máx. 40MB • PDF, JPG, PNG, WebP
                            </span>
                          </label>
                          {iptu?.comprovante_url && (
                            <label className="flex items-center gap-2 text-sm sm:col-span-2">
                              <input 
                                type="checkbox" 
                                name="remover_comprovante" 
                                value="true"
                                className="rounded border" 
                                style={{ borderColor: "var(--color-line)" }}
                              />
                              <span style={{ color: "var(--color-alert)" }}>
                                Remover comprovante atual
                              </span>
                            </label>
                          )}
                          <TextArea label="Observações" name="observacoes" className="sm:col-span-2" />
                        </div>

            <div className="sm:col-span-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}