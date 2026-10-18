import Link from "next/link";
import type { ReactNode } from "react";
import { sairPortal } from "../actions";

/**
 * Layout compartilhado das páginas autenticadas do Portal do Inquilino.
 * A verificação de sessão é feita em cada página (não aqui) para não
 * bloquear a página de login.
 */
export function PortalShell({
  nomeInquilino,
  children,
}: {
  nomeInquilino: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-paper)", fontFamily: "var(--font-sans)" }}>
      <header
        className="border-b"
        style={{ borderColor: "var(--color-line)", background: "var(--color-card-bg)" }}
      >
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "var(--color-teal)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight" style={{ color: "var(--color-ink)" }}>
                Portal do Inquilino
              </p>
              <p className="text-xs leading-tight" style={{ color: "var(--color-ink-soft)" }}>
                {nomeInquilino}
              </p>
            </div>
          </div>
          <form action={sairPortal}>
            <button
              type="submit"
              className="rounded-sm border px-4 py-2 text-sm font-medium transition-colors"
              style={{ borderColor: "var(--color-alert)", color: "var(--color-alert)" }}
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <footer className="border-t py-6 text-center text-xs" style={{ borderColor: "var(--color-line)", color: "var(--color-ink-soft)" }}>
        <p>
          Portal do Inquilino — Gestão de Aluguéis ·{" "}
          <Link href="/portal" className="underline">
            Voltar ao login
          </Link>
        </p>
      </footer>
    </div>
  );
}
