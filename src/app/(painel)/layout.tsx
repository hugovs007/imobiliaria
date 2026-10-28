import { createClient } from "@/lib/supabase/server";
import { BarraLateral } from "./barra-lateral";
import { MobileHeader } from "./MobileHeader";
import { MobileMenuProvider } from "./MobileMenuContext";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nome = user?.email ?? "";
  let papel = "";
  let empresaNome = "";
  let semAcesso = false;
  if (user) {
    const { data: perfil, error } = await supabase
      .from("profiles")
      .select("nome, papel, empresa_id")
      .eq("id", user.id)
      .maybeSingle();
    // Se a coluna empresa_id ainda não existir (migration 0020 não aplicada),
    // ignoramos o erro para não travar o painel durante a transição.
    if (!error && perfil) {
      nome = perfil.nome;
      papel = perfil.papel;
      if (perfil.empresa_id) {
        const { data: empresa } = await supabase
          .from("empresas")
          .select("nome")
          .eq("id", perfil.empresa_id)
          .maybeSingle();
        empresaNome = empresa?.nome ?? "";
      } else if (papel !== "super_admin") {
        semAcesso = true;
      }
    }
  }

  if (semAcesso) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div
          className="w-full max-w-md rounded-md border p-8 text-center"
          style={{ borderColor: "var(--color-line)", background: "var(--color-card-bg)" }}
        >
          <h1 className="text-xl font-bold" style={{ color: "var(--color-ink)" }}>
            Conta sem empresa vinculada
          </h1>
          <p className="mt-3 text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Seu usuário não está vinculado a nenhuma empresa. Peça ao administrador para vincular
            sua conta antes de continuar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen print:min-h-0">
      <MobileMenuProvider>
        <BarraLateral nome={nome} papel={papel} empresaNome={empresaNome} />

        <div className="flex-1 min-w-0 flex flex-col">
          <MobileHeader empresaNome={empresaNome} />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">{children}</main>
        </div>
      </MobileMenuProvider>
    </div>
  );
}
