"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function entrar(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    redirect(`/login?erro=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export async function solicitarRecuperacaoSenha(formData: FormData) {
  const email = String(formData.get("email") ?? "");

  if (!email || !email.includes("@")) {
    return { error: "Informe um e-mail válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/redefinir-senha`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function redefinirSenha(formData: FormData) {
  const novaSenha = String(formData.get("novaSenha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");

  if (!novaSenha || novaSenha.length < 6) {
    return { error: "A nova senha deve ter pelo menos 6 caracteres." };
  }

  if (novaSenha !== confirmarSenha) {
    return { error: "As senhas não conferem." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: novaSenha });

  if (error) {
    return { error: error.message };
  }

  redirect("/login?config=senha_atualizada");
}
