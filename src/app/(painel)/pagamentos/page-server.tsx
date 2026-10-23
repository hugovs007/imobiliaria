import { createClient } from "@/lib/supabase/server";
import { atualizarAtrasados } from "./actions";
import { sincronizarBaixasSePendente } from "./boletos-actions";
import PagamentosClient from "./page-client";

export default async function PagamentosPage() {
  const supabase = await createClient();

  // Atualiza status de atrasados antes de buscar os dados
  await atualizarAtrasados();

  // Sincroniza baixas de boletos do Banco do Brasil (no máx. 1x a cada 2h)
  await sincronizarBaixasSePendente();

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