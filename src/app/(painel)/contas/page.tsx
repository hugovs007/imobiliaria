import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, Money, PageHeader, Select, StatusBadge, Table } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { criarConta, marcarContaPaga } from "./actions";
import { SeletorImovelContas } from "./seletor-imovel-contas";

export default async function ContasPage() {
  const supabase = await createClient();

  const [{ data: contas }, { data: imoveis, error: imoveisError }] = await Promise.all([
    supabase
      .from("contas_consumo")
      .select("id, imovel_id, tipo, competencia, valor, responsavel, paga, imoveis(logradouro, numero, bairro, cidade)")
      .order("competencia", { ascending: false }),
    supabase.from("imoveis").select("id, codigo, logradouro, numero, bairro, cidade, status, matricula_agua, matricula_luz").order("logradouro"),
  ]);

  let listaImoveis = imoveis ?? [];

  // Se a consulta falhar (ex.: migration das matrículas ainda não aplicada),
  // tenta novamente sem as colunas novas para a página não quebrar em silêncio.
  if (imoveisError) {
    console.error("Erro ao carregar imóveis (contas):", imoveisError.message);
    const { data: imoveisFallback } = await supabase
      .from("imoveis")
      .select("id, codigo, logradouro, numero, bairro, cidade, status")
      .order("logradouro");
    listaImoveis = (imoveisFallback ?? []).map((i) => ({ ...i, matricula_agua: null, matricula_luz: null }));
  }
  // Contas desta página são pagas pelo proprietário: imóveis alugados ficam fora da lista
  const imoveisDisponiveis = listaImoveis.filter((i) => (i.status ?? "").toLowerCase().trim() !== "alugado");

  const rotuloImovel = (i: {
    codigo: string | null;
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
  }) =>
    [i.codigo, [i.logradouro, i.numero].filter(Boolean).join(", "), [i.bairro, i.cidade].filter(Boolean).join(" - ")]
      .filter(Boolean)
      .join(" — ");

  return (
    <div>
      <PageHeader title="Contas de água e energia" subtitle="Controle de consumo por imóvel." />

      <Card>
        <form action={criarConta} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SeletorImovelContas
            imoveis={imoveisDisponiveis.map((i) => ({
              id: i.id,
              label: rotuloImovel(i),
              matricula_agua: i.matricula_agua ?? null,
              matricula_luz: i.matricula_luz ?? null,
            }))}
          />
          <Select
            label="Tipo"
            name="tipo"
            defaultValue="agua"
            options={[
              { value: "agua", label: "Água" },
              { value: "energia", label: "Energia" },
              { value: "outra", label: "Outra" },
            ]}
          />
          <Field label="Competência (mês)" name="competencia" type="month" required />
          <Field label="Valor (R$)" name="valor" type="number" step="0.01" required />
          <Select
            label="Responsável pelo pagamento"
            name="responsavel"
            defaultValue="proprietario"
            options={[
              { value: "proprietario", label: "Proprietário" },
              { value: "inquilino", label: "Inquilino" },
            ]}
          />
          <div className="sm:col-span-2">
            <Button>Registrar conta</Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <Table head={["Imóvel", "Tipo", "Competência", "Valor", "Responsável", "Paga", ""]}>
          {(contas ?? []).map((c) => {
            const imovelConta = c.imoveis as unknown as { logradouro: string | null; numero: string | null } | null;
            return (
              <tr key={c.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                <td className="px-4 py-2.5">
                  {[imovelConta?.logradouro, imovelConta?.numero].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-2.5 capitalize">{c.tipo}</td>
                <td className="px-4 py-2.5">
                  {new Date(`${String(c.competencia).slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR", {
                    month: "2-digit",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-2.5">
                  <Money value={c.valor} />
                </td>
                <td className="px-4 py-2.5 capitalize">{c.responsavel}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={c.paga ? "Pago" : "Pendente"} />
                </td>
                <td className="px-4 py-2.5">
                  {!c.paga && (
                    <form action={marcarContaPaga}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button variant="ghost">Marcar paga</Button>
                    </form>
                  )}
                  <RecordEditor
                    entity="contas_consumo"
                    id={c.id}
                    fields={[
                      {
                        name: "imovel_id",
                        label: "Imóvel",
                        kind: "select",
                        value: c.imovel_id,
                        options: listaImoveis
                          .filter((i) => (i.status ?? "").toLowerCase().trim() !== "alugado" || i.id === c.imovel_id)
                          .map((i) => ({ value: i.id, label: rotuloImovel(i) })),
                      },
                      {
                        name: "tipo",
                        label: "Tipo",
                        kind: "select",
                        value: c.tipo,
                        options: [{ value: "agua", label: "Água" }, { value: "energia", label: "Energia" }, { value: "outra", label: "Outra" }],
                      },
                      { name: "competencia", label: "Competência", value: String(c.competencia).slice(0, 7), type: "month", required: true },
                      { name: "valor", label: "Valor (R$)", value: c.valor, type: "number", step: "0.01", required: true },
                      {
                        name: "responsavel",
                        label: "Responsável",
                        kind: "select",
                        value: c.responsavel,
                        options: [{ value: "proprietario", label: "Proprietário" }, { value: "inquilino", label: "Inquilino" }],
                      },
                      {
                        name: "paga",
                        label: "Situação",
                        kind: "select",
                        value: c.paga ? "true" : "false",
                        options: [{ value: "false", label: "Pendente" }, { value: "true", label: "Paga" }],
                      },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </Table>
      </div>
    </div>
  );
}
