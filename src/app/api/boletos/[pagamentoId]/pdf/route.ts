import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { obterConfigBB } from "@/lib/bb/config";
import { baixarPdfBoletoBB } from "@/lib/bb/client";

export const dynamic = "force-dynamic";

/**
 * Proxy do PDF do boleto: o link do BB exige Bearer token, então o navegador
 * não consegue baixar direto. A rota autentica (proxy + RLS), busca o
 * PDF no BB e devolve como application/pdf.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pagamentoId: string }> }
) {
  try {
    const { pagamentoId } = await params;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pagamentos")
      .select("boleto_pdf_url")
      .eq("id", pagamentoId)
      .maybeSingle();

    if (error || !data?.boleto_pdf_url) {
      return NextResponse.json({ error: "Boleto não encontrado." }, { status: 404 });
    }

    const config = await obterConfigBB();
    if (!config) {
      return NextResponse.json(
        { error: "Integração com o Banco do Brasil não configurada." },
        { status: 503 }
      );
    }

    const pdf = await baixarPdfBoletoBB(config, data.boleto_pdf_url);

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="boleto-${pagamentoId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Erro ao servir PDF do boleto:", err);
    return NextResponse.json({ error: "Falha ao gerar o PDF do boleto." }, { status: 500 });
  }
}
