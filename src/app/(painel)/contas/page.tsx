import { createClient } from "@/lib/supabase/server";
import { Button, Card, Money, PageHeader, StatusBadge, Table } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { marcarContaPaga } from "./actions";
import { FormCriarConta } from "./form-criar-conta";

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

  // competencia vem como "YYYY-MM" (varchar(7)); aceita também "YYYY-MM-DD" por segurança.
  const formatarCompetencia = (valor: string | null | undefined) => {
    const comp = String(valor ?? "").slice(0, 10);
    const [ano, mes] = comp.split("-");
    if (ano && mes && /^\d{4}$/.test(ano) && /^\d{2}$/.test(mes)) {
      return `${mes}/${ano}`;
    }
    return comp || "—";
  };

  type ContaConsumo = {
    id: string;
    imovel_id: string;
    tipo: string;
    competencia: string;
    valor: number;
    responsavel: string;
    paga: boolean;
    imoveis: unknown;
  };

  type ImovelResumo = {
    id: string;
    codigo: string | null;
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
    matricula_agua: string | null;
    matricula_luz: string | null;
  };

  const contasLista = (contas ?? []) as ContaConsumo[];

  // Agrupa as contas por imóvel: cada imóvel aparece uma única vez, com suas contas dentro.
  const grupos = new Map<string, { imovel: ImovelResumo; contas: ContaConsumo[] }>();
  for (const conta of contasLista) {
    const grupo = grupos.get(conta.imovel_id);
    if (grupo) {
      grupo.contas.push(conta);
      continue;
    }
    const imovelLista = listaImoveis.find((i) => i.id === conta.imovel_id);
    const imovelConta = conta.imoveis as { logradouro: string | null; numero: string | null } | null;
    grupos.set(conta.imovel_id, {
      imovel: imovelLista
        ? {
            id: imovelLista.id,
            codigo: imovelLista.codigo,
            logradouro: imovelLista.logradouro,
            numero: imovelLista.numero,
            bairro: imovelLista.bairro,
            cidade: imovelLista.cidade,
            matricula_agua: imovelLista.matricula_agua ?? null,
            matricula_luz: imovelLista.matricula_luz ?? null,
          }
        : {
            id: conta.imovel_id,
            codigo: null,
            logradouro: imovelConta?.logradouro ?? null,
            numero: imovelConta?.numero ?? null,
            bairro: null,
            cidade: null,
            matricula_agua: null,
            matricula_luz: null,
          },
      contas: [conta],
    });
  }

  // Ordena os grupos pelo nome do imóvel.
  const gruposOrdenados = Array.from(grupos.values()).sort((a, b) =>
    rotuloImovel(a.imovel).localeCompare(rotuloImovel(b.imovel), "pt-BR")
  );

  return (
    <div>
      <PageHeader title="Contas de água e energia" subtitle="Controle de consumo por imóvel." />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              Nova conta
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
              Abra o formulário para registrar uma conta de água ou energia.
            </p>
          </div>
          <FormCriarConta
            imoveis={imoveisDisponiveis.map((i) => ({
              id: i.id,
              label: rotuloImovel(i),
              matricula_agua: i.matricula_agua ?? null,
              matricula_luz: i.matricula_luz ?? null,
            }))}
          />
        </div>
      </Card>

      <div className="mt-8 space-y-6">
        {gruposOrdenados.length === 0 && (
          <Card>
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
              Nenhuma conta registrada ainda. Use o botão "Nova conta" para registrar a primeira.
            </p>
          </Card>
        )}

        {gruposOrdenados.map((grupo) => {
          const total = grupo.contas.reduce((soma, c) => soma + (c.valor ?? 0), 0);
          const pendentes = grupo.contas.filter((c) => !c.paga).length;
          return (
            <Card key={grupo.imovel.id}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold" style={{ color: "var(--color-ink)" }}>
                    {rotuloImovel(grupo.imovel)}
                  </h3>
                  {(grupo.imovel.matricula_agua || grupo.imovel.matricula_luz) && (
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>
                      {grupo.imovel.matricula_agua && <span>Matrícula água: {grupo.imovel.matricula_agua}</span>}
                      {grupo.imovel.matricula_luz && <span>Matrícula energia: {grupo.imovel.matricula_luz}</span>}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                    {grupo.contas.length} {grupo.contas.length === 1 ? "conta" : "contas"}
                    {pendentes > 0 ? ` · ${pendentes} ${pendentes === 1 ? "pendente" : "pendentes"}` : ""}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
                    Total: <Money value={total} />
                  </p>
                </div>
              </div>

              <Table head={["Tipo", "Competência", "Valor", "Responsável", "Paga", ""]}>
                {grupo.contas.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                    <td className="px-4 py-2.5 capitalize">{c.tipo}</td>
                    <td className="px-4 py-2.5">{formatarCompetencia(c.competencia)}</td>
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
                ))}
              </Table>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
