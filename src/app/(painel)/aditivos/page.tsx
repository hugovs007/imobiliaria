import { createClient } from "@/lib/supabase/server";
import { Button, Card, PageHeader, StatusBadge, Table } from "@/components/ui";
import { excluirAditivo } from "./actions";
import { FormCriarAditivo, type ContratoOpcao } from "./form-criar-aditivo";

function formatarDataBR(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarMoedaBR(valor: number | null): string {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const TIPOS_ADTIIVO_LABEL: Record<string, string> = {
  valor: "Valor",
  prazo: "Prazo",
  clausula: "Cláusula",
  outro: "Outro",
};

export default async function AditivosPage() {
  const supabase = await createClient();

  const [aditivosRes, contratosRes] = await Promise.all([
    supabase
      .from("aditivos")
      .select(
        `id, tipo, descricao, data_assinatura, valor_anterior, valor_novo, nova_data_fim, documento_url, created_at,
         contratos(codigo, valor_atual, inquilinos(nome), imoveis(logradouro, numero, bairro, cidade))`
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("contratos")
      .select(
        `id, codigo, valor_atual, data_fim,
         inquilinos(nome), imoveis(logradouro, numero, bairro, cidade)`
      )
      .eq("status", "ativo")
      .order("created_at", { ascending: false }),
  ]);

  const aditivos = Array.isArray(aditivosRes.data) ? aditivosRes.data : [];
  const contratos = Array.isArray(contratosRes.data) ? contratosRes.data : [];

  const contratosFormatados: ContratoOpcao[] = contratos.map((c: Record<string, unknown>) => {
    const inquilino = c.inquilinos as { nome: string | null } | null;
    const imovel = c.imoveis as { logradouro: string | null; numero: string | null; bairro: string | null; cidade: string | null } | null;
    const imovelTexto = imovel
      ? `${imovel.logradouro ?? ""}${imovel.numero ? `, ${imovel.numero}` : ""}${
          imovel.bairro ? ` — ${imovel.bairro}` : ""
        }${imovel.cidade ? ` (${imovel.cidade})` : ""}`
      : null;
    return {
      id: String(c.id ?? ""),
      codigo: (c.codigo as string | null) ?? null,
      inquilino: inquilino?.nome ?? null,
      imovel: imovelTexto,
      valorAtual: (c.valor_atual as number | null) ?? null,
      dataFim: (c.data_fim as string | null) ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aditivos contratuais"
        subtitle="Registre alterações de valor, prazo e cláusulas dos contratos de aluguel."
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold" style={{ color: "var(--color-ink)" }}>
              Aditivos registrados
            </h2>
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
              {aditivos.length} aditivo(s) no total.
            </p>
          </div>
          <FormCriarAditivo contratos={contratosFormatados} />
        </div>

        {aditivos.length === 0 ? (
          <div className="mt-6">
            <Card>
              <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
                Nenhum aditivo registrado ainda. Clique em <strong>+ Novo aditivo</strong> para
                registrar a primeira alteração contratual.
              </p>
            </Card>
          </div>
        ) : (
          <div className="mt-6">
            <Table head={["Contrato", "Tipo", "Descrição", "Assinatura", "Valor", "Nova data fim", "Documento", ""]}>
              {aditivos.map((a: Record<string, unknown>) => {
                const contrato = a.contratos as Record<string, unknown> | null;
                const inquilino = contrato?.inquilinos as { nome: string | null } | null;
                const imovel = contrato?.imoveis as
                  | { logradouro: string | null; numero: string | null; bairro: string | null; cidade: string | null }
                  | null;
                const tipo = (a.tipo as string) ?? "outro";
                const valorAnterior = a.valor_anterior as number | null;
                const valorNovo = a.valor_novo as number | null;
                const temValor = valorAnterior !== null || valorNovo !== null;

                return (
                  <tr key={String(a.id)} style={{ borderTop: "1px solid var(--color-line)" }}>
                    <td className="px-3 py-3 text-sm">
                      <div style={{ color: "var(--color-ink)" }}>
                        {contrato?.codigo ? `#${contrato.codigo}` : "s/ código"}
                      </div>
                      <div className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                        {inquilino?.nome ?? "s/ inquilino"}
                        {imovel
                          ? ` — ${imovel.logradouro ?? ""}${imovel.numero ? `, ${imovel.numero}` : ""}`
                          : ""}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <StatusBadge status={tipo} />
                    </td>
                    <td className="max-w-[20rem] px-3 py-3 text-sm" style={{ color: "var(--color-ink)" }}>
                      {String(a.descricao ?? "")}
                    </td>
                    <td className="px-3 py-3 text-sm" style={{ color: "var(--color-ink)" }}>
                      {formatarDataBR((a.data_assinatura as string | null) ?? null)}
                    </td>
                    <td className="px-3 py-3 text-sm" style={{ color: "var(--color-ink)" }}>
                      {temValor ? (
                        <span>
                          {formatarMoedaBR(valorAnterior)} → <strong>{formatarMoedaBR(valorNovo)}</strong>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm" style={{ color: "var(--color-ink)" }}>
                      {formatarDataBR((a.nova_data_fim as string | null) ?? null)}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      {a.documento_url ? (
                        <a
                          href={String(a.documento_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                          style={{ color: "var(--color-teal)" }}
                        >
                          Abrir
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <form action={excluirAditivo}>
                        <input type="hidden" name="id" value={String(a.id)} />
                        <Button type="submit" variant="ghost" size="sm">
                          Excluir
                        </Button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
