import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, StatusBadge, Table } from "@/components/ui";
import { atualizarStatusLead, excluirLead } from "./actions";
import { FormCriarLead, type ImovelOpcao } from "./form-criar-lead";

function formatarDataBR(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

const STATUS_ORDEM = ["novo", "em_atendimento", "visitou", "contratou", "perdido"] as const;

const PROXIMO_STATUS: Record<string, { value: string; label: string } | null> = {
  novo: { value: "em_atendimento", label: "→ Em atendimento" },
  em_atendimento: { value: "visitou", label: "→ Visitou" },
  visitou: { value: "contratou", label: "→ Contratou" },
  contratou: null,
  perdido: null,
};

export default async function LeadsPage() {
  const supabase = await createClient();

  const [leadsRes, imoveisRes] = await Promise.all([
    supabase
      .from("leads")
      .select(
        `id, nome, telefone, email, origem, status, observacoes, created_at,
         imoveis(logradouro, numero, bairro, cidade)`
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("imoveis")
      .select("id, logradouro, numero, bairro, cidade")
      .order("logradouro", { ascending: true }),
  ]);

  const leads = Array.isArray(leadsRes.data) ? leadsRes.data : [];
  const imoveis = Array.isArray(imoveisRes.data) ? imoveisRes.data : [];

  const imoveisFormatados: ImovelOpcao[] = imoveis.map((i: Record<string, unknown>) => ({
    id: String(i.id ?? ""),
    texto: `${i.logradouro ?? ""}${i.numero ? `, ${i.numero}` : ""}${
      i.bairro ? ` — ${i.bairro}` : ""
    }${i.cidade ? ` (${i.cidade})` : ""}`,
  }));

  const leadsPorStatus = STATUS_ORDEM.map((status) => ({
    status,
    itens: leads.filter((l: Record<string, unknown>) => (l.status as string) === status),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        subtitle="Interessados em seus imóveis — capte pelo site e acompanhe o funil de conversão."
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold" style={{ color: "var(--color-ink)" }}>
              Funil de leads
            </h2>
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
              {leads.length} lead(s) no total —{" "}
              {STATUS_ORDEM.map((s) => `${s.replace("_", " ")}: ${leadsPorStatus.find((g) => g.status === s)?.itens.length ?? 0}`).join(" · ")}
            </p>
          </div>
          <FormCriarLead imoveis={imoveisFormatados} />
        </div>
      </Card>

      {leads.length === 0 ? (
        <Card>
          <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Nenhum lead registrado ainda. Clique em <strong>+ Novo lead</strong> ou integre a API
            pública <code>/api/leads</code> ao formulário do seu site para captar interessados
            automaticamente.
          </p>
        </Card>
      ) : (
        leadsPorStatus.map(({ status, itens }) => (
          <Card key={status}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-semibold capitalize" style={{ color: "var(--color-ink)" }}>
                <StatusBadge status={status} />
                <span className="text-sm font-normal" style={{ color: "var(--color-ink-soft)" }}>
                  ({itens.length})
                </span>
              </h3>
            </div>

            {itens.length === 0 ? (
              <p className="mt-3 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                Nenhum lead neste estágio.
              </p>
            ) : (
              <div className="mt-4">
                <Table head={["Lead", "Contato", "Imóvel de interesse", "Origem", "Criado em", ""]}>
                  {itens.map((l: Record<string, unknown>) => {
                    const imovel = l.imoveis as
                      | { logradouro: string | null; numero: string | null; bairro: string | null; cidade: string | null }
                      | null;
                    const proximo = PROXIMO_STATUS[(l.status as string) ?? ""] ?? null;
                    const created = (l.created_at as string | null) ?? null;

                    return (
                      <tr key={String(l.id)} style={{ borderTop: "1px solid var(--color-line)" }}>
                        <td className="px-3 py-3 text-sm">
                          <div style={{ color: "var(--color-ink)" }}>{String(l.nome ?? "")}</div>
                          {l.observacoes ? (
                            <div className="max-w-[16rem] text-xs" style={{ color: "var(--color-ink-soft)" }}>
                              {String(l.observacoes)}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-sm" style={{ color: "var(--color-ink)" }}>
                          <div>{String(l.telefone ?? "")}</div>
                          {l.email ? (
                            <div className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                              {String(l.email)}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-sm" style={{ color: "var(--color-ink)" }}>
                          {imovel
                            ? `${imovel.logradouro ?? ""}${imovel.numero ? `, ${imovel.numero}` : ""}${
                                imovel.bairro ? ` — ${imovel.bairro}` : ""
                              }`
                            : "—"}
                        </td>
                        <td className="px-3 py-3 text-sm" style={{ color: "var(--color-ink)" }}>
                          {l.origem ? String(l.origem) : "—"}
                        </td>
                        <td className="px-3 py-3 text-sm" style={{ color: "var(--color-ink)" }}>
                          {formatarDataBR(created ? created.slice(0, 10) : null)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-2">
                            {proximo && (
                              <form action={atualizarStatusLead}>
                                <input type="hidden" name="id" value={String(l.id)} />
                                <input type="hidden" name="status" value={proximo.value} />
                                <button
                                  type="submit"
                                  className="text-sm underline"
                                  style={{ color: "var(--color-teal)" }}
                                >
                                  {proximo.label}
                                </button>
                              </form>
                            )}
                            <form action={excluirLead}>
                              <input type="hidden" name="id" value={String(l.id)} />
                              <button
                                type="submit"
                                className="text-sm underline"
                                style={{ color: "var(--color-alert)" }}
                              >
                                Excluir
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </Table>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
