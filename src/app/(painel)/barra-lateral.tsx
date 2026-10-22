"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { sair } from "./actions";
import { useMobileMenu } from "./MobileMenuContext";

// Navigation sections for better organization
const navSections = [
  {
    title: "Principal",
    items: [
      { href: "/", label: "Painel", icon: <Icone><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></Icone> },
      { href: "/imoveis", label: "Imóveis", icon: <Icone><rect x="4" y="2" width="16" height="20" rx="1" /><path d="M9 22v-4h6v4" /><path d="M9 6h.01" /><path d="M15 6h.01" /><path d="M9 10h.01" /><path d="M15 10h.01" /><path d="M9 14h.01" /><path d="M15 14h.01" /></Icone> },
      { href: "/proprietarios", label: "Proprietários", icon: <Icone><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Icone> },
      { href: "/inquilinos", label: "Inquilinos", icon: <Icone><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" /></Icone> },
    ],
  },
  {
    title: "Operações",
    items: [
      { href: "/contratos", label: "Contratos", icon: <Icone><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></Icone> },
      { href: "/pagamentos", label: "Pagamentos", icon: <Icone><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01" /><path d="M18 12h.01" /></Icone> },
      { href: "/manutencoes", label: "Manutenções", icon: <Icone><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></Icone> },
      { href: "/contas", label: "Contas (água/energia)", icon: <Icone><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" /></Icone> },
      { href: "/ocorrencias", label: "Ocorrências", icon: <Icone><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Icone> },
      { href: "/vistorias", label: "Vistorias", icon: <Icone><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></Icone> },
      { href: "/aditivos", label: "Aditivos", icon: <Icone><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M9 15h6" /><path d="M12 12v6" /></Icone> },
    ],
  },
  {
    title: "Comercial",
    items: [
      { href: "/leads", label: "Leads", icon: <Icone><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6" /><path d="M22 11h-6" /></Icone> },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/arquivos", label: "Arquivos", icon: <Icone><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></Icone> },
      { href: "/relatorios", label: "Relatórios", icon: <Icone><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></Icone> },
      { href: "/indices", label: "Índices (IGP-M/IPCA)", icon: <Icone><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></Icone> },
      { href: "/equipe", label: "Equipe", icon: <Icone><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icone> },
    ],
  },
];

function Icone({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type NavItem = { href: string; label: string; icon: ReactNode };
type NavSection = { title: string; items: NavItem[] };

export function BarraLateral({ nome, papel }: { nome: string; papel: string }) {
  const pathname = usePathname();
  const { isOpen: mobileAberta, close: fecharMobile } = useMobileMenu();
  const [recolhida, setRecolhida] = useState(false);
  const [animar, setAnimar] = useState(false);

  // Restaura a preferência salva (menu recolhido no desktop)
  useEffect(() => {
    try {
      if (window.localStorage.getItem("painel-menu-recolhido") === "1") {
        setRecolhida(true);
      }
    } catch {
      // localStorage indisponível: mantém expandido
    }
  }, []);

  function alternarRecolher() {
    setAnimar(true);
    const novoValor = !recolhida;
    setRecolhida(novoValor);
    try {
      window.localStorage.setItem("painel-menu-recolhido", novoValor ? "1" : "0");
    } catch {
      // falha ao persistir: altera apenas em memória
    }
  }

  function handleNavClick() {
    // Close mobile sidebar on navigation
    fecharMobile();
  }

  return (
    <>
      <button
        type="button"
        className={`panel-menu-backdrop ${mobileAberta ? "is-open" : ""}`}
        onClick={fecharMobile}
        aria-label="Fechar menu"
        tabIndex={mobileAberta ? 0 : -1}
      />

      <aside
        id="painel-menu-lateral"
        data-open={mobileAberta}
        data-collapsed={recolhida}
        data-anim={animar}
        className="panel-sidebar print:hidden"
        style={{ borderColor: "var(--color-line)", background: "var(--color-card-bg)" }}
        aria-label="Navegação principal"
      >
        {/* Recolher/expandir menu (desktop) */}
        <button
          type="button"
          onClick={alternarRecolher}
          title={recolhida ? "Expandir menu" : "Recolher menu"}
          aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
          aria-expanded={!recolhida}
          className="panel-sidebar-toggle"
        >
          <Icone>{recolhida ? <path d="m9 18 6-6-6-6" /> : <path d="m15 18-6-6 6-6" />}</Icone>
        </button>

        {/* Header */}
        <div
          className={`flex h-16 shrink-0 items-center justify-between border-b px-4 ${recolhida ? "lg:justify-center" : ""}`}
          style={{ borderColor: "var(--color-line)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--color-teal)" }}>
              <Icone>
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <path d="M9 22V12h6v10" />
              </Icone>
            </div>
            <span
              className={`font-semibold text-lg whitespace-nowrap ${recolhida ? "lg:hidden" : ""}`}
              style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
            >
              Gestão de Aluguéis
            </span>
          </div>
          
          {/* Drawer close button */}
          <button
            type="button"
            onClick={fecharMobile}
            title="Fechar menu"
            aria-label="Fechar menu"
            aria-expanded={mobileAberta}
            className="rounded-lg p-2 transition-colors hover:bg-black/5 lg:hidden"
            style={{ color: "var(--color-ink-soft)" }}
          >
            <Icone><path d="m18 6-12 12" /></Icone>
          </button>
        </div>

        {/* Navigation */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Menu principal">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <h3
                className={`hidden px-2 text-xs font-semibold uppercase tracking-wider ${recolhida ? "" : "lg:block"}`}
                style={{ color: "var(--color-ink-soft)" }}
              >
                {section.title}
              </h3>
              <div className="space-y-0.5" role="list">
                {section.items.map((item) => {
                  const ativo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleNavClick}
                      role="listitem"
                      title={recolhida ? item.label : undefined}
                      className={`group flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${recolhida ? "lg:justify-center lg:px-0" : ""} ${ativo ? "bg-[var(--color-teal)]/10 font-semibold" : "hover:bg-black/5"}`}
                      style={{ 
                        color: ativo ? "var(--color-teal)" : "var(--color-ink)",
                        borderRadius: "0.5rem",
                      }}
                    >
                      <span className="shrink-0" style={{ color: ativo ? "var(--color-teal)" : "var(--color-ink-soft)" }}>
                        {item.icon}
                      </span>
                      <span className={`whitespace-nowrap truncate ${recolhida ? "lg:hidden" : ""}`}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t p-4" style={{ borderColor: "var(--color-line)" }}>
          <div className="space-y-1">
            <p className={`font-medium text-sm truncate ${recolhida ? "lg:hidden" : ""}`} style={{ color: "var(--color-ink)" }}>{nome}</p>
            {papel && <p className={`text-xs truncate ${recolhida ? "lg:hidden" : ""}`} style={{ color: "var(--color-ink-soft)" }}>{papel}</p>}
          </div>
          <form action={sair} className="mt-3">
            <button
              type="submit"
              title="Sair"
              aria-label="Sair"
              className={`flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${recolhida ? "lg:justify-center lg:px-0" : ""}`}
              style={{ 
                color: "var(--color-alert)",
                background: "transparent",
                border: "1px solid var(--color-alert)",
              }}
            >
              <Icone>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
              </Icone>
              <span className={recolhida ? "lg:hidden" : ""}>Sair</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
