import { createClient } from "@/lib/supabase/server";
import { Card, Money, PageHeader, StatusBadge, Table } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { FormCriarImovel } from "./form-criar-imovel";
import { FINALIDADES, STATUS_IMOVEL, TIPOS_IMOVEL } from "./opcoes";

export default async function ImoveisPage() {
  const supabase = await createClient();

  const [{ data: imoveis, error: imoveisError }, { data: proprietarios }] = await Promise.all([
    supabase
      .from("imoveis")
      .select("id, codigo, proprietario_id, logradouro, numero, complemento, bairro, cidade, uf, cep, tipo, finalidade, status, area_total, area_util, valor_aluguel, valor_condominio, iptu_mensal, matricula, matricula_agua, matricula_luz, observacoes, proprietarios(nome)")
      .order("created_at", { ascending: false }),
    supabase.from("proprietarios").select("id, nome").order("nome"),
  ]);

  let listaImoveis = imoveis ?? [];

  // Se a consulta principal falhar (ex.: migration das matrículas ainda não aplicada),
  // tenta novamente sem as colunas novas para a lista nunca ficar vazia em silêncio.
  if (imoveisError) {
    console.error("Erro ao carregar imóveis:", imoveisError.message);
    const { data: imoveisFallback } = await supabase
      .from("imoveis")
      .select("id, codigo, proprietario_id, logradouro, numero, complemento, bairro, cidade, uf, cep, tipo, finalidade, status, area_total, area_util, valor_aluguel, valor_condominio, iptu_mensal, matricula, observacoes, proprietarios(nome)")
      .order("created_at", { ascending: false });
    listaImoveis = (imoveisFallback ?? []).map((i) => ({ ...i, matricula_agua: null, matricula_luz: null }));
  }

  const listaProprietarios = proprietarios ?? [];

  return (
    <div>
      <PageHeader title="Imóveis" subtitle="Cadastro da carteira de imóveis administrados." />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              Novo imóvel
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
              Abra o formulário para cadastrar um imóvel na carteira administrada.
            </p>
          </div>
          <FormCriarImovel proprietarios={listaProprietarios} />
        </div>
      </Card>

      <div className="mt-8">
        <Table head={["Código", "Logradouro", "Número", "Complemento", "Cidade/UF", "Tipo", "Finalidade", "Proprietário", "Aluguel", "Status", ""]}>
          {listaImoveis.map((i) => (
            <tr key={i.id} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="px-4 py-2.5 font-mono">{i.codigo ?? "—"}</td>
              <td className="px-4 py-2.5">{i.logradouro}</td>
              <td className="px-4 py-2.5">{i.numero ?? "—"}</td>
              <td className="px-4 py-2.5">{i.complemento ?? "—"}</td>
              <td className="px-4 py-2.5">
                {i.cidade}/{i.uf}
              </td>
              <td className="px-4 py-2.5">{i.tipo}</td>
              <td className="px-4 py-2.5">{i.finalidade}</td>
              <td className="px-4 py-2.5">{(i.proprietarios as unknown as { nome: string } | null)?.nome ?? "—"}</td>
              <td className="px-4 py-2.5">
                <Money value={i.valor_aluguel} />
              </td>
              <td className="px-4 py-2.5">
                <StatusBadge status={i.status} />
              </td>
              <td className="px-4 py-2.5">
                <RecordEditor
                  entity="imoveis"
                  id={i.id}
                  fields={[
                    { name: "codigo", label: "Código interno", value: i.codigo },
                    {
                      name: "proprietario_id",
                      label: "Proprietário",
                      kind: "select",
                      value: i.proprietario_id,
                      options: [{ value: "", label: "— não vinculado —" }, ...listaProprietarios.map((p) => ({ value: p.id, label: p.nome }))],
                    },
                    { name: "tipo", label: "Tipo", kind: "select", value: i.tipo, options: TIPOS_IMOVEL },
                    { name: "finalidade", label: "Finalidade", kind: "select", value: i.finalidade, options: FINALIDADES },
                    { name: "status", label: "Status", kind: "select", value: i.status, options: STATUS_IMOVEL },
                    { name: "cep", label: "CEP", value: i.cep },
                    { name: "logradouro", label: "Logradouro", value: i.logradouro, required: true },
                    { name: "numero", label: "Número", value: i.numero },
                    { name: "complemento", label: "Complemento", value: i.complemento },
                    { name: "bairro", label: "Bairro", value: i.bairro },
                    { name: "cidade", label: "Cidade", value: i.cidade, required: true },
                    { name: "uf", label: "UF", value: i.uf, required: true },
                    { name: "area_total", label: "Área Total (m²)", value: i.area_total, type: "number", step: "0.01" },
                    { name: "area_util", label: "Área Útil (m²)", value: i.area_util, type: "number", step: "0.01" },
                    { name: "valor_aluguel", label: "Valor Aluguel (R$)", value: i.valor_aluguel, type: "number", step: "0.01", required: true },
                    { name: "valor_condominio", label: "Valor Condomínio (R$)", value: i.valor_condominio, type: "number", step: "0.01" },
                    { name: "iptu_mensal", label: "IPTU Mensal (R$)", value: i.iptu_mensal, type: "number", step: "0.01" },
                    { name: "matricula", label: "Matrícula", value: i.matricula },
                    { name: "matricula_agua", label: "Matrícula da companhia de água", value: i.matricula_agua },
                    { name: "matricula_luz", label: "Matrícula da companhia de energia", value: i.matricula_luz },
                    { name: "observacoes", label: "Observações", value: i.observacoes, kind: "textarea" },
                  ]}
                />
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}