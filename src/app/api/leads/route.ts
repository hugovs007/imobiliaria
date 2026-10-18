import { NextResponse } from "next/server";
import { createPortalClient } from "@/lib/portal-auth";

/**
 * API pública de captação de leads.
 *
 * Endpoint para integrar com o formulário "Tenho interesse" do site
 * (WordPress, Landing Page, Framer, Webflow etc.).
 *
 * POST /api/leads
 * Content-Type: application/json
 * CORS: liberado (Access-Control-Allow-Origin: *)
 *
 * Body:
 * {
 *   "nome": "Maria Souza",        // obrigatório
 *   "telefone": "(11) 99999-0000", // obrigatório
 *   "email": "maria@email.com",    // opcional
 *   "imovel_id": "uuid",          // opcional (id do imóvel no sistema)
 *   "origem": "Site",             // opcional (default "Site")
 *   "observacoes": "...",         // opcional
 *   "website": ""                 // honeypot anti-spam — se preenchido, rejeita silenciosamente
 * }
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Corpo da requisição inválido (JSON esperado)." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Honeypot: bots costumam preencher todos os campos.
    const honeypot = String(body.website ?? "").trim();
    if (honeypot) {
      // Responde "sucesso" para não entregar informação ao bot.
      return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
    }

    const nome = String(body.nome ?? "").trim();
    const telefone = String(body.telefone ?? "").trim();

    if (!nome || !telefone) {
      return NextResponse.json(
        { ok: false, error: "Informe nome e telefone." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const email = String(body.email ?? "").trim() || null;
    const imovelId = String(body.imovel_id ?? "").trim() || null;
    const origem = String(body.origem ?? "").trim() || "Site";
    const observacoes = String(body.observacoes ?? "").trim() || null;

    let supabase;
    try {
      supabase = await createPortalClient();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Servidor não configurado para captação de leads (SUPABASE_SERVICE_ROLE_KEY ausente).",
        },
        { status: 503, headers: CORS_HEADERS }
      );
    }

    const { error } = await supabase.from("leads").insert([
      {
        nome,
        telefone,
        email,
        imovel_id: imovelId,
        origem,
        observacoes,
        status: "novo",
      },
    ]);

    if (error) {
      console.error("Erro ao inserir lead via API pública:", error.message);
      return NextResponse.json(
        { ok: false, error: "Não foi possível registrar o lead agora. Tente novamente." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { ok: true, message: "Recebemos seu contato! Em breve entraremos em contato." },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("Erro na rota /api/leads:", err);
    return NextResponse.json(
      { ok: false, error: "Erro interno. Tente novamente mais tarde." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
