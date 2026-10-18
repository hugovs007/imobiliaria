import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessaoPortal } from "@/lib/portal-auth";
import { PortalShell } from "../components/PortalShell";
import { FormAtualizarContatos } from "../components/FormAtualizarContatos";

export const metadata = {
  title: "Início | Portal do Inquilino",
};

function formatarDataBR(dataRaw: string | null): string {
  if (!dataRaw) return "—";
  const data = new Date(dataRaw.includes("T") ? dataRaw : `${dataRaw}T00:00:00`);
  return data.toLocaleDateString("pt-BR");
}

function formatarMoeda(valor: number | string | null): string {
  const n = typeof valor === "string" ? parseFloat(valor) : (valor ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PortalInicioPage() {
  const contratoId = await getSessaoPortal();
  if (!contratoId) redirect("/portal");

  const { createPortalClient } = await import("@/lib/portal-auth");
  const supabase = await createPortalClient();

  const { data: contrato } = await supabase
    .from("contratos")
    .select(
      `id, codigo, data_inicio, data_fim, dia_vencimento, valor_atual, ativo,
       imoveis(logradouro, numero, bairro, cidade, uf),
       inquilinos(nome, email, telefone)`
    )
    .eq("id", contratoId)
    .maybeSingle();

  if (!contrato) redirect("/portal");

  const { data: pagamentos } = await supabase
    .from("pagamentos")
    .select("id, competencia, data_vencimento, data_pagamento, valor_pago, status")
    .eq("contrato_id", contratoId)
    .order("competencia", { ascending: false })
    .limit(24);

  const lista = pagamentos ?? [];
  const pendentes = lista.filter((p) => p.status === "pendente" || p.status === "atrasado");
  const pagos = lista.filter((p) => p.status === "pago");

  const imovel = Array.isArray(contrato.imoveis) ? contrato.imoveis[0] : contrato.imoveis;
  const inquilino = Array.isArray(contrato.inquilinos) ? contrato.inquilinos[0] : contrato.inquilinos;

  return (
    <PortalShell nomeInquilino={inquilino?.nome || "Inquilino"}>
      <div className="space-y-8">
        {/* Dados do contrato */}
        <section className="rounded-md border p-5" style={{ borderColor: "var(--color-line)", background: "var(--color-card-bg)" }}>
          <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-serif)" }}>
            Meu contrato
          </h2>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt style={{ color: "var(--color-ink-soft)" }}>Código</dt>
              <dd className="font-medium" style={{ color: "var(--color-ink)" }}>{contrato.codigo}</dd>
            </div>
            <div>
              <dt style={{ color: "var(--color-ink-soft)" }}>Imóvel</dt>
              <dd className="font-medium" style={{ color: "var(--color-ink)" }}>
                {imovel ? `${imovel.logradouro || ""}${imovel.numero ? `, ${imovel.numero}` : ""}${imovel.bairro ? ` — ${imovel.bairro}` : ""}` : "—"}
              </dd>
            </div>
            <div>
              <dt style={{ color: "var(--color-ink-soft)" }}>Vencimento</dt>
              <dd className="font-medium" style={{ color: "var(--color-ink)" }}>Todo dia {contrato.dia_vencimento}</dd>
            </div>
            <div>
              <dt style={{ color: "var(--color-ink-soft)" }}>Aluguel</dt>
              <dd className="font-medium" style={{ color: "var(--color-ink)" }}>{formatarMoeda(contrato.valor_atual)}</dd>
            </div>
            <div>
              <dt style={{ color: "var(--color-ink-soft)" }}>Início</dt>
              <dd className="font-medium" style={{ color: "var(--color-ink)" }}>{formatarDataBR(contrato.data_inicio)}</dd>
            </div>
            <div>
              <dt style={{ color: "var(--color-ink-soft)" }}>Fim</dt>
              <dd className="font-medium" style={{ color: "var(--color-ink)" }}>{formatarDataBR(contrato.data_fim)}</dd>
            </div>
          </dl>
        </section>

        {/* Pagamentos pendentes */}
        <section className="rounded-md border p-5" style={{ borderColor: "var(--color-line)", background: "var(--color-card-bg)" }}>
          <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-serif)" }}>
            Pagamentos pendentes
          </h2>
          {pendentes.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
              Nenhum pagamento pendente. Você está em dia! 🎉
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border" style={{ borderColor: "var(--color-line)" }}>
              <table className="w-full text-sm">
                <thead style={{ background: "var(--color-paper)" }}>
                  <tr className="text-left">
                    <th className="p-3 font-medium" style={{ color: "var(--color-ink-soft)" }}>Competência</th>
                    <th className="p-3 font-medium" style={{ color: "var(--color-ink-soft)" }}>Vencimento</th>
                    <th className="p-3 font-medium" style={{ color: "var(--color-ink-soft)" }}>Valor</th>
                    <th className="p-3 font-medium" style={{ color: "var(--color-ink-soft)" }}>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {pendentes.map((p) => (
                    <tr key={p.id} className="border-t" style={{ borderColor: "var(--color-line)" }}>
                      <td className="p-3" style={{ color: "var(--color-ink)" }}>{formatarDataBR(p.competencia)}</td>
                      <td className="p-3" style={{ color: "var(--color-ink)" }}>{formatarDataBR(p.data_vencimento)}</td>
                      <td className="p-3" style={{ color: "var(--color-ink)" }}>{formatarMoeda(p.valor_pago || 0)}</td>
                      <td className="p-3">
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: p.status === "atrasado" ? "var(--color-alert)1a" : "var(--color-warn)1a",
                            color: p.status === "atrasado" ? "var(--color-alert)" : "var(--color-warn)",
                          }}
                        >
                          {p.status === "atrasado" ? "Atrasado" : "Pendente"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Histórico */}
        <section className="rounded-md border p-5" style={{ borderColor: "var(--color-line)", background: "var(--color-card-bg)" }}>
          <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-serif)" }}>
            Histórico de pagamentos
          </h2>
          {pagos.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
              Nenhum pagamento registrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border" style={{ borderColor: "var(--color-line)" }}>
              <table className="w-full text-sm">
                <thead style={{ background: "var(--color-paper)" }}>
                  <tr className="text-left">
                    <th className="p-3 font-medium" style={{ color: "var(--color-ink-soft)" }}>Competência</th>
                    <th className="p-3 font-medium" style={{ color: "var(--color-ink-soft)" }}>Pago em</th>
                    <th className="p-3 font-medium" style={{ color: "var(--color-ink-soft)" }}>Valor</th>
                    <th className="p-3 font-medium" style={{ color: "var(--color-ink-soft)" }}>Recibo</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id} className="border-t" style={{ borderColor: "var(--color-line)" }}>
                      <td className="p-3" style={{ color: "var(--color-ink)" }}>{formatarDataBR(p.competencia)}</td>
                      <td className="p-3" style={{ color: "var(--color-ink)" }}>{formatarDataBR(p.data_pagamento)}</td>
                      <td className="p-3" style={{ color: "var(--color-ink)" }}>{formatarMoeda(p.valor_pago)}</td>
                      <td className="p-3">
                        <Link
                          href={`/portal/recibo/${p.id}`}
                          className="underline font-medium"
                          style={{ color: "var(--color-teal)" }}
                        >
                          Ver recibo
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Meus contatos */}
        <section className="rounded-md border p-5" style={{ borderColor: "var(--color-line)", background: "var(--color-card-bg)" }}>
          <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-serif)" }}>
            Meus contatos
          </h2>
          <p className="mb-4 text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Mantenha seus dados atualizados para receber avisos da imobiliária.
          </p>
          <FormAtualizarContatos email={inquilino?.email || ""} telefone={inquilino?.telefone || ""} />
        </section>
      </div>
    </PortalShell>
  );
}
