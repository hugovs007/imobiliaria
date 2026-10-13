"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { solicitarRecuperacaoSenha } from "@/app/login/actions";

export default function RecuperarSenhaPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem(null);
    setCarregando(true);

    const formData = new FormData();
    formData.set("email", email);

    const resultado = await solicitarRecuperacaoSenha(formData);
    setCarregando(false);

    if (resultado.error) {
      setMensagem({ tipo: "erro", texto: resultado.error });
    } else {
      setMensagem({ tipo: "sucesso", texto: "Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha." });
      setEmail("");
    }
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
          Recuperar senha
        </p>

        {mensagem && (
          <p className="mb-4 text-sm" style={{ color: mensagem.tipo === "sucesso" ? "var(--color-ok)" : "var(--color-alert)" }}>
            {mensagem.texto}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span style={{ color: "var(--color-ink-soft)" }}>E-mail</span>
            <input
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {carregando ? "Enviando..." : "Enviar link de recuperação"}
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