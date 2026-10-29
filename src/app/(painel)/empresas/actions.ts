"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigirSuperAdmin } from "@/lib/empresa";

export async function criarEmpresa(formData: FormData) {
  try {
    await exigirSuperAdmin();

    const nome = String(formData.get("nome") || "").trim();
    if (!nome) return { error: "Informe o nome da empresa." };

    const supabase = await createClient();
    const { error } = await supabase.from("empresas").insert({
      nome,
      cnpj_cpf: String(formData.get("cnpj_cpf") || "").trim() || null,
      cidade: String(formData.get("cidade") || "").trim() || null,
      uf: String(formData.get("uf") || "").trim() || null,
      telefone: String(formData.get("telefone") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      ativo: true,
    });

    if (error) return { error: error.message };

    revalidatePath("/empresas");
    return { success: true as const };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao criar empresa." };
  }
}

export async function criarAdminEmpresa(formData: FormData) {
  try {
    await exigirSuperAdmin();

    const empresaId = String(formData.get("empresa_id") || "").trim();
    const nome = String(formData.get("nome") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const senha = String(formData.get("senha") || "");

    if (!empresaId) return { error: "Selecione a empresa." };
    if (!nome) return { error: "Informe o nome do administrador." };
    if (!email) return { error: "Informe o e-mail do administrador." };
    if (senha.length < 6) return { error: "A senha deve ter no mínimo 6 caracteres." };

    const admin = await createAdminClient();

    // Cria o usuário de autenticação (ou reaproveita, caso já exista).
    let userId: string | undefined;
    const { data: criado, error: erroCriacao } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });
    if (criado?.user?.id) {
      userId = criado.user.id;
    } else if (erroCriacao) {
      // getUserByEmail não existe; usa listUsers e filtra por email
      const { data: users } = await admin.auth.admin.listUsers();
      const existente = users.users.find((u) => u.email === email);
      userId = existente?.id;
      if (!userId) return { error: erroCriacao.message };
    }

    // Vincula o perfil à empresa com papel de administrador.
    const { error: erroPerfil } = await admin.from("profiles").upsert(
      {
        id: userId,
        nome,
        email,
        papel: "admin",
        ativo: true,
        empresa_id: empresaId,
      },
      { onConflict: "id" }
    );

    if (erroPerfil) return { error: erroPerfil.message };

    revalidatePath("/empresas");
    return { success: true as const };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao criar administrador." };
  }
}

export async function alternarEmpresaAtivo(formData: FormData) {
  await exigirSuperAdmin();

  const id = String(formData.get("id") || "").trim();
  const ativo = formData.get("ativo") === "true";
  if (!id) throw new Error("Empresa inválida.");

  const supabase = await createClient();
  const { error } = await supabase.from("empresas").update({ ativo: !ativo }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/empresas");
}
