"use client";

import { useActionState } from "react";
import { atualizarMeusContatos, type ActionState } from "../actions";

const estadoInicial: ActionState = {};

export function FormAtualizarContatos({ email, telefone }: { email: string; telefone: string }) {
  const [state, formAction, isPending] = useActionState(atualizarMeusContatos, estadoInicial);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div
          className="rounded-md border p-3 text-sm"
          style={{ borderColor: "var(--color-alert)", color: "var(--color-alert)", background: "var(--color-alert)1a" }}
          role="alert"
        >
          {state.error}
        </div>
      )}
      {state?.success && (
        <div
          className="rounded-md border p-3 text-sm"
          style={{ borderColor: "var(--color-ok)", color: "var(--color-ok)", background: "var(--color-ok)1a" }}
          role="status"
        >
          Contatos atualizados com sucesso!
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span style={{ color: "var(--color-ink-soft)" }}>E-mail</span>
          <input
            name="email"
            type="email"
            defaultValue={email}
            placeholder="voce@email.com"
            className="border p-2 rounded"
            style={{ borderColor: "var(--color-line)" }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span style={{ color: "var(--color-ink-soft)" }}>Telefone</span>
          <input
            name="telefone"
            defaultValue={telefone}
            placeholder="(00) 00000-0000"
            className="border p-2 rounded"
            style={{ borderColor: "var(--color-line)" }}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`rounded-sm px-4 py-2 text-sm font-medium transition-colors ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
        style={{ background: "var(--color-teal)", color: "var(--color-paper)" }}
      >
        {isPending ? "Salvando..." : "Salvar contatos"}
      </button>
    </form>
  );
}
