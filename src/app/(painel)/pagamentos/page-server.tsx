import { createClient } from "@/lib/supabase/server";
import { atualizarAtrasados } from "./actions";
import { sincronizarBaixasSePendente } from "./boletos-actions";
import { getS3Client } from "@/lib/aws/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import PagamentosClient from "./page-client";

async function getComprovantePresignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    const client = getS3Client();
    const presignedUrl = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET!, Key: path }),
      { expiresIn: 3600 }
    );
    return presignedUrl;
  } catch {
    return null;
  }
}

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

    // Gera URLs presigned para comprovantes das movimentações
    for (const pagamento of pagamentos) {
      if (pagamento.movimentacoes_pagamento) {
        for (const mov of pagamento.movimentacoes_pagamento) {
          if (mov.comprovante_url) {
            mov.comprovante_presigned_url = await getComprovantePresignedUrl(mov.comprovante_url);
          }
        }
      }
    }
  } catch (err: any) {
    console.error("Erro ao carregar pagamentos:", err);
    error = err.message || "Erro ao carregar dados do banco de dados.";
  }

  return <PagamentosClient initialPagamentos={pagamentos} initialContratos={contratos} error={error} />;
}