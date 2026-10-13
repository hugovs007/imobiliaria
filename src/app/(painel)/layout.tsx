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
  if (user) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("nome, papel")
      .eq("id", user.id)
      .maybeSingle();
    if (perfil) {
      nome = perfil.nome;
      papel = perfil.papel;
    }
  }

  return (
    <div className="flex min-h-screen print:min-h-0">
      <MobileMenuProvider>
        <BarraLateral nome={nome} papel={papel} />

        <div className="flex-1 min-w-0 flex flex-col">
          <MobileHeader />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">{children}</main>
        </div>
      </MobileMenuProvider>
    </div>
  );
}
