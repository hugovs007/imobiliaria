"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMobileMenu } from "./MobileMenuContext";

function Icone({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function MobileHeader({ empresaNome }: { empresaNome?: string }) {
  const pathname = usePathname();
  const { isOpen, toggle, close } = useMobileMenu();

  // Close mobile menu on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-3 print:hidden lg:hidden" style={{ borderColor: "var(--color-line)", background: "var(--color-card-bg)" }}>
      <Link href="/" className="flex items-center gap-2" style={{ color: "var(--color-ink)" }}>
        <Icone>
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M9 22V12h6v10" />
        </Icone>
        <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
          {empresaNome || "Gestão de Aluguéis"}
        </span>
      </Link>

      <button
        type="button"
        onClick={toggle}
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isOpen}
        aria-controls="painel-menu-lateral"
        className="rounded-sm p-2 transition-colors hover:bg-black/5"
        style={{ color: "var(--color-ink-soft)" }}
      >
        <Icone>{isOpen ? <path d="m18 6-12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}</Icone>
      </button>
    </header>
  );
}