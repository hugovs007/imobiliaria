"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { redefinirSenha } from "@/app/login/actions";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [tokenValido, setTokenValido] = useState(true);

  useEffect(() => {
    // Verifica se há token na URL (Supabase envia via hash fragment ou query params)
    const hash = window.location.hash;
    const accessToken = searchParams.get("access_token") || 
      (hash.includes("access_token=") ? hash.split("access_token=")[1].split("&")[0] : null);
    
    if (!accessToken) {
      setTokenValido(false);
      setMensagem({ 
        tipo: "erro", 
        texto: "Link de recuperação inválido ou expirado. Solicite um novo link." 
      });
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem(null);
    setCarregando(true);

    const formData = new FormData();
    formData.set("novaSenha", novaSenha);
    formData.set("confirmarSenha", confirmarSenha);

    const resultado = await redefinirSenha(formData);
    setCarregando(false);

    if (resultado.error) {
      setMensagem({ tipo: "erro", texto: resultado.error });
    } else {
      // Sucesso - o redirect é feito pela server action
    }
  }

  if (!tokenValido) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1
            className="mb-1 text-3xl font-semibold"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
          >
            Gestão de Aluguéis
          </h1>
          <p className="mb-8 text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Redefinir senha
          </p>

          <div className="mb-6 rounded-md border p-4 text-sm" style={{ borderColor: "var(--color-alert)", background: "var(--color-alert)1a", color: "var(--color-alert)" }}>
            {mensagem?.texto}
          </div>

          <a
            href="/recuperar-senha"
            className="underline hover:no-underline"
            style={{ color: "var(--color-teal)" }}
          >
            Solicitar novo link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1
          className="mb-1 text-3xl font-semibold"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
        >
          Gestão de Aluguéis
        </h1>
        <p className="mb-8 text-sm" style={{ color: "var(--color-ink-soft)" }}>
          Nova senha
        </p>

        {mensagem && (
          <p className="mb-4 text-sm" style={{ color: mensagem.tipo === "sucesso" ? "var(--color-ok)" : "var(--color-alert)" }}>
            {mensagem.texto}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span style={{ color: "var(--color-ink-soft)" }}>Nova senha</span>
            <input
              name="novaSenha"
              type="password"
              required
              minLength={6}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="rounded-sm border px-3 py-2"
              style={{ borderColor: "var(--color-line)" }}
              disabled={carregando}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span style={{ color: "var(--color-ink-soft)" }}>Confirmar nova senha</span>
            <input
              name="confirmarSenha"
              type="password"
              required
              minLength={6}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="rounded-sm border px-3 py-2"
              style={{ borderColor: "var(--color-line)" }}
              disabled={carregando}
            />
          </label>

          <button
            type="submit"
            disabled={carregando}
            className="mt-2 rounded-sm px-4 py-2 text-sm font-medium"
            style={{
              background: carregando ? "var(--color-ink-soft)" : "var(--color-teal)",
              color: "var(--color-paper)",
            }}
          >
            {carregando ? "Atualizando..." : "Salvar nova senha"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--color-ink-soft)" }}>
          <a
            href="/login"
            className="underline hover:no-underline"
            style={{ color: "var(--color-teal)" }}
          >
            Voltar para o login
          </a>
        </p>
      </div>
    </div>
  );
}