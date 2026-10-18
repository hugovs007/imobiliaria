import { redirect } from "next/navigation";
import { getSessaoPortal, portalConfigurado } from "@/lib/portal-auth";
import { FormEntrarPortal } from "./components/FormEntrarPortal";

export const metadata = {
  title: "Portal do Inquilino",
};

export default async function PortalLoginPage() {
  // Se já tem sessão válida, vai direto para o início
  const sessao = await getSessaoPortal();
  if (sessao) redirect("/portal/inicio");

  const configurado = portalConfigurado();

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--color-paper)", fontFamily: "var(--font-sans)" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "var(--color-teal)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="h-7 w-7" aria-hidden="true">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <path d="M9 22V12h6v10" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-serif)" }}>
            Portal do Inquilino
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Consulte seus pagamentos e baixe recibos
          </p>
        </div>

        <div className="rounded-md border p-6" style={{ borderColor: "var(--color-line)", background: "var(--color-card-bg)" }}>
          {!configurado ? (
            <div
              className="rounded-md border p-4 text-sm"
              style={{ borderColor: "var(--color-alert)", color: "var(--color-alert)", background: "var(--color-alert)1a" }}
              role="alert"
            >
              <p className="font-medium">Portal em configuração</p>
              <p className="mt-1">
                O administrador precisa adicionar a variável <code>SUPABASE_SERVICE_ROLE_KEY</code> ao ambiente do servidor.
                Enquanto isso, o acesso ao portal fica indisponível.
              </p>
            </div>
          ) : (
            <FormEntrarPortal />
          )}
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: "var(--color-ink-soft)" }}>
          Use o CPF cadastrado no contrato e o código fornecido pela imobiliária.
        </p>
      </div>
    </div>
  );
}
