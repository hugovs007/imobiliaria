"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  PORTAL_COOKIE,
  assinarSessaoPortal,
  createPortalClient,
  getSessaoPortal,
  normalizarDocumento,
} from "@/lib/portal-auth";

export type ActionState = { success?: boolean; error?: string | null };

/**
 * Login do portal: CPF do inquilino + código do contrato.
 * A comparação de CPF é feita em JS (após normalizar dígitos) porque o
 * armazenamento no banco pode conter pontuação.
 */
export async function entrarPortal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const cpf = normalizarDocumento(String(formData.get("cpf") || ""));
  const codigo = String(formData.get("codigo") || "").trim();

  if (!cpf || !codigo) {
    return { error: "Informe o CPF e o código do contrato." };
  }

  try {
    const supabase = await createPortalClient();

    const { data: contrato, error } = await supabase
      .from("contratos")
      .select("id, codigo, ativo, inquilinos(cpf_cnpj)")
      .ilike("codigo", codigo)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("entrarPortal: erro ao buscar contrato", error);
      return { error: "Não foi possível validar o contrato. Tente novamente." };
    }

    if (!contrato || contrato.ativo === false) {
      return { error: "Contrato não encontrado ou inativo." };
    }

    const inquilino = Array.isArray(contrato.inquilinos)
      ? contrato.inquilinos[0]
      : contrato.inquilinos;
    const cpfBanco = normalizarDocumento(inquilino?.cpf_cnpj || "");

    if (!cpfBanco || cpfBanco !== cpf) {
      return { error: "CPF não corresponde ao inquilino deste contrato." };
    }

    const cookieStore = await cookies();
    cookieStore.set(PORTAL_COOKIE, assinarSessaoPortal(contrato.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    redirect("/portal/inicio");
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // redirect
    console.error("entrarPortal", e);
    return { error: "Erro inesperado. Tente novamente." };
  }
}

export async function sairPortal() {
  const cookieStore = await cookies();
  cookieStore.delete(PORTAL_COOKIE);
  redirect("/portal");
}

export async function atualizarMeusContatos(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const contratoId = await getSessaoPortal();
  if (!contratoId) redirect("/portal");

  const telefone = String(formData.get("telefone") || "").trim();
  const email = String(formData.get("email") || "").trim();

  if (!telefone && !email) {
    return { error: "Informe ao menos um contato." };
  }

  try {
    const supabase = await createPortalClient();
    const { data: contrato } = await supabase
      .from("contratos")
      .select("inquilino_id")
      .eq("id", contratoId)
      .maybeSingle();

    if (!contrato?.inquilino_id) {
      return { error: "Inquilino não encontrado." };
    }

    const atualizacao: Record<string, string> = {};
    if (telefone) atualizacao.telefone = telefone;
    if (email) atualizacao.email = email;

    const { error } = await supabase
      .from("inquilinos")
      .update(atualizacao)
      .eq("id", contrato.inquilino_id);

    if (error) {
      console.error("atualizarMeusContatos", error);
      return { error: "Não foi possível salvar. Tente novamente." };
    }

    return { success: true };
  } catch (e) {
    console.error("atualizarMeusContatos", e);
    return { error: "Erro inesperado. Tente novamente." };
  }
}

/**
 * Utilitário interno: garante sessão válida e retorna o client do portal.
 * Todas as páginas autenticadas do portal devem usar isto.
 */
export async function exigirSessaoPortal() {
  const contratoId = await getSessaoPortal();
  if (!contratoId) redirect("/portal");
  const supabase = await createPortalClient();
  return { contratoId, supabase };
}
