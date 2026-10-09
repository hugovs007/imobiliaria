import { createClient } from "@/lib/supabase/server";
import { BarraLateral } from "./barra-lateral";

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
      <BarraLateral nome={nome} papel={papel} />

      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10">{children}</main>
    </div>
  );
}
