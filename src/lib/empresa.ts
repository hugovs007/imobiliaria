import { createClient } from "@/lib/supabase/server";

export type PerfilAtual = {
  id: string;
  nome: string | null;
  email: string | null;
  papel: string | null;
  empresa_id: string | null;
};

export type EmpresaAtual = {
  id: string;
  nome: string;
  cnpj_cpf: string | null;
  nacionalidade: string | null;
  estado_civil: string | null;
  profissao: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  whatsapp: string | null;
  chave_pix: string | null;
  logo_url: string | null;
  ativo: boolean;
};

/** Retorna o perfil do usuário logado (ou null se não houver perfil). */
export async function obterPerfilAtual(): Promise<PerfilAtual | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, nome, email, papel, empresa_id")
    .eq("id", user.id)
    .maybeSingle();
  return (data as PerfilAtual | null) ?? null;
}

/** Retorna a empresa vinculada ao usuário logado (ou null). */
export async function obterEmpresaAtual(): Promise<EmpresaAtual | null> {
  const perfil = await obterPerfilAtual();
  if (!perfil?.empresa_id) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", perfil.empresa_id)
    .maybeSingle();
  return (data as EmpresaAtual | null) ?? null;
}

/** Lança erro se o usuário logado não for super administrador. */
export async function exigirSuperAdmin(): Promise<PerfilAtual> {
  const perfil = await obterPerfilAtual();
  if (!perfil) throw new Error("Não autenticado.");
  if (perfil.papel !== "super_admin") {
    throw new Error("Apenas o super administrador pode executar esta ação.");
  }
  return perfil;
}
