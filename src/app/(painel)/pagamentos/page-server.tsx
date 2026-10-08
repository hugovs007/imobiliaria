import { createClient } from "@/lib/supabase/server";
import PagamentosClient from "./page-client";

export default async function PagamentosPage() {
  const supabase = await createClient();

  let pagamentos: any[] = [];
  let contratos: any[] = [];
  let error: string | null = null;

  try {
    const [{ data: pagamentosData, error: pagamentosError }, { data: contratosData, error: contratosError }] = await Promise.all([
      supabase
        .from("pagamentos")
        .select(
          `
          *,
          contratos (
            *,
            imoveis (*),
            inquilinos (*)
          ),
          movimentacoes_pagamento (*)
        `
        )
        .order("competencia", { ascending: false }),

      supabase
        .from("contratos")
        .select(`
          *,
          imoveis (*),
          inquilinos (*)
        `)
        .order("data_inicio", { ascending: false }),
    ]);

    if (pagamentosError) throw pagamentosError;
    if (contratosError) throw contratosError;

    pagamentos = pagamentosData ?? [];
    contratos = contratosData ?? [];
  } catch (err: any) {
    console.error("Erro ao carregar pagamentos:", err);
    error = err.message || "Erro ao carregar dados do banco de dados.";
  }

  return <PagamentosClient initialPagamentos={pagamentos} initialContratos={contratos} error={error} />;
}