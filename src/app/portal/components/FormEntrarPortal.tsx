"use client";

import { useActionState } from "react";
import { entrarPortal, type ActionState } from "../actions";

const estadoInicial: ActionState = {};

export function FormEntrarPortal() {
  const [state, formAction, isPending] = useActionState(entrarPortal, estadoInicial);

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

      <label className="flex flex-col gap-1 text-sm">
        <span style={{ color: "var(--color-ink-soft)" }}>CPF</span>
        <input
          name="cpf"
          required
          inputMode="numeric"
          placeholder="000.000.000-00"
          className="border p-2 rounded"
          style={{ borderColor: "var(--color-line)" }}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span style={{ color: "var(--color-ink-soft)" }}>Código do contrato</span>
        <input
          name="codigo"
          required
          placeholder="Ex.: CTR-0001"
          className="border p-2 rounded"
          style={{ borderColor: "var(--color-line)" }}
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className={`w-full rounded-sm px-4 py-2.5 text-sm font-medium transition-colors ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
        style={{ background: "var(--color-teal)", color: "var(--color-paper)" }}
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
