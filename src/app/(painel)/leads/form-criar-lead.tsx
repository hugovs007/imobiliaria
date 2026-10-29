"use client";

import { useRef, useState } from "react";
import { criarLead } from "./actions";
import { Button, Field, Select, TextArea } from "@/components/ui";

export interface ImovelOpcao {
  id: string;
  texto: string;
}

const ORIGENS_SUGERIDAS = [
  "Site",
  "WhatsApp",
  "Instagram",
  "Facebook",
  "Indicação",
  "Placa no imóvel",
  "Outro",
];

export function FormCriarLead({ imoveis }: { imoveis: ImovelOpcao[] }) {
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
    const resultado = await criarLead(formData);

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
        + Novo lead
      </Button>
      <dialog
        ref={dialogRef}
        className="m-auto max-h-[90vh] w-[min(50rem,calc(100vw-2rem))] overflow-y-auto rounded-md border bg-white p-0 shadow-2xl backdrop:bg-black/50"
      >
        <div className="p-6">
          <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
            Novo lead
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
            <Field label="Nome" name="nome" required placeholder="Nome do interessado" />
            <Field label="Telefone/WhatsApp" name="telefone" required placeholder="(00) 00000-0000" />
            <Field label="E-mail" name="email" type="email" placeholder="email@exemplo.com" />
            <Select
              label="Imóvel de interesse"
              name="imovel_id"
              options={[
                { value: "", label: "— nenhum / não informado —" },
                ...imoveis.map((i) => ({ value: i.id, label: i.texto })),
              ]}
            />
            <Select
              label="Origem"
              name="origem"
              options={[
                { value: "", label: "— não informada —" },
                ...ORIGENS_SUGERIDAS.map((o) => ({ value: o, label: o })),
              ]}
            />
            <div className="hidden" aria-hidden="true">
              {/* Honeypot anti-spam (campo "website" nunca deve ser preenchido) */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <TextArea
              label="Observações"
              name="observacoes"
              placeholder="Anotações sobre o contato, preferências, prazo de mudança etc."
            />
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar lead"}
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
