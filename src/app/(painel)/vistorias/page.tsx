import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, StatusBadge, Table } from "@/components/ui";
import { excluirVistoria } from "./actions";
import { FormCriarVistoria } from "./form-criar-vistoria";

function formatarDataBR(valor: string | null): string {
  if (!valor) return "—";
  const data = valor.includes("T") ? valor : `${valor}T00:00:00`;
  return new Date(data).toLocaleDateString("pt-BR");
}

export default async function VistoriasPage() {
  const supabase = await createClient();

  const [{ data: vistorias }, { data: itens }, { data: imoveis }, { data: contratos }] =
    await Promise.all([
      supabase
        .from("vistorias")
        .select(
          "id, tipo, data_vistoria, vistoriador, imoveis(logradouro, numero, bairro, cidade), contratos(codigo, inquilinos(nome))"
        )
        .order("data_vistoria", { ascending: false }),
      supabase.from("vistoria_itens").select("vistoria_id"),
      supabase
        .from("imoveis")
        .select("id, logradouro, numero, bairro, cidade")
        .order("logradouro", { ascending: true }),
      supabase
        .from("contratos")
        .select("id, codigo, ativo, inquilinos(nome), imoveis(logradouro, numero)")
        .order("created_at", { ascending: false }),
    ]);

  const listaVistorias = vistorias ?? [];
  const listaItens = itens ?? [];
  const listaImoveis = imoveis ?? [];
  const listaContratos = contratos ?? [];

  const contagemItens: Record<string, number> = {};
  for (const item of listaItens) {
    contagemItens[item.vistoria_id] = (contagemItens[item.vistoria_id] ?? 0) + 1;
  }

  const imoveisFormatados = listaImoveis.map((i) => ({
    id: i.id,
    endereco: [i.logradouro, i.numero].filter(Boolean).join(", ") || "Imóvel sem endereço",
  }));

  const contratosFormatados = listaContratos.map((c) => {
    const inquilino = Array.isArray(c.inquilinos)
      ? c.inquilinos[0]?.nome
      : (c.inquilinos as unknown as { nome: string } | null)?.nome ?? null;
    const imovel = Array.isArray(c.imoveis)
      ? c.imoveis[0]
      : (c.imoveis as unknown as { logradouro: string | null; numero: string | null } | null);
    const enderecoImovel = imovel
      ? [imovel.logradouro, imovel.numero].filter(Boolean).join(", ")
      : null;
    return { id: c.id, codigo: c.codigo, inquilino, imovel: enderecoImovel };
  });

  return (
    <div>
      <PageHeader
        title="Vistorias"
        subtitle="Registre vistorias de entrada, saída e periódicas com checklist completo por cômodo."
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              Nova vistoria
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
              O checklist padrão é gerado automaticamente e pode ser ajustado item a item.
            </p>
          </div>
          <FormCriarVistoria imoveis={imoveisFormatados} contratos={contratosFormatados} />
        </div>
      </Card>

      <div className="mt-8">
        <h2
          className="mb-3 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Vistorias registradas ({listaVistorias.length})
        </h2>
        {listaVistorias.length === 0 ? (
          <Card>
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
              Nenhuma vistoria registrada ainda. Crie a primeira vistoria para gerar o checklist
              automático.
            </p>
          </Card>
        ) : (
          <Table head={["Data", "Tipo", "Imóvel", "Contrato", "Vistoriador", "Itens", ""]}>
            {listaVistorias.map((v) => {
              const imovel = Array.isArray(v.imoveis)
                ? v.imoveis[0]
                : (v.imoveis as unknown as {
                    logradouro: string | null;
                    numero: string | null;
                    bairro: string | null;
                    cidade: string | null;
                  } | null);
              const contrato = Array.isArray(v.contratos)
                ? v.contratos[0]
                : (v.contratos as unknown as { codigo: string | null; inquilinos: unknown } | null);
              const inquilino = contrato
                ? Array.isArray(contrato.inquilinos)
                  ? (contrato.inquilinos[0] as { nome: string } | undefined)?.nome
                  : (contrato.inquilinos as unknown as { nome: string } | null)?.nome
                : null;
              const endereco = imovel
                ? [imovel.logradouro, imovel.numero, imovel.bairro, imovel.cidade]
                    .filter(Boolean)
                    .join(", ")
                : "—";
              return (
                <tr key={v.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatarDataBR(v.data_vistoria)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <StatusBadge status={v.tipo} />
                  </td>
                  <td className="px-4 py-2.5">{endereco}</td>
                  <td className="px-4 py-2.5">
                    {contrato?.codigo
                      ? `${contrato.codigo}${inquilino ? ` — ${inquilino}` : ""}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">{v.vistoriador || "—"}</td>
                  <td className="px-4 py-2.5">{contagemItens[v.id] ?? 0}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/vistorias/${v.id}`}
                        className="text-sm font-medium"
                        style={{ color: "var(--color-teal)" }}
                      >
                        Abrir
                      </Link>
                      <form action={excluirVistoria}>
                        <input type="hidden" name="id" value={v.id} />
                        <button
                          type="submit"
                          className="text-sm font-medium"
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
        )}
      </div>
    </div>
  );
}
