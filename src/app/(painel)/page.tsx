import { createClient } from "@/lib/supabase/server";
import { Card, Money, PageHeader, StatusBadge, Table } from "@/components/ui";
import { FiltrosPeriodo } from "./filtros-periodo";
import { atualizarAtrasados } from "./pagamentos/actions";

type Registro = Record<string, any>;

function mesCompetenciaAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

type Periodo = { chave: string; rotulo: string; de: string | null; ate: string | null };

function subtrairMeses(base: string, quantidade: number) {
  const [ano, mes] = base.split("-").map(Number);
  const data = new Date(ano, mes - 1 - quantidade, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function resolverPeriodo(params: Record<string, string | string[] | undefined>): Periodo {
  const atual = mesCompetenciaAtual();
  const ano = atual.slice(0, 4);
  const chave = typeof params.periodo === "string" && params.periodo ? params.periodo : "mes";

  switch (chave) {
    case "tudo":
      return { chave, rotulo: "Todo o histórico", de: null, ate: null };
    case "3m":
      return { chave, rotulo: "Últimos 3 meses", de: subtrairMeses(atual, 2), ate: atual };
    case "6m":
      return { chave, rotulo: "Últimos 6 meses", de: subtrairMeses(atual, 5), ate: atual };
    case "ano":
      return { chave, rotulo: `Ano ${ano}`, de: `${ano}-01`, ate: `${ano}-12` };
    case "custom": {
      const de = typeof params.de === "string" && /^\d{4}-\d{2}$/.test(params.de) ? params.de : null;
      const ate = typeof params.ate === "string" && /^\d{4}-\d{2}$/.test(params.ate) ? params.ate : null;
      if (de && ate) return { chave, rotulo: `${de} a ${ate}`, de, ate };
      if (de) return { chave, rotulo: `A partir de ${de}`, de, ate: null };
      if (ate) return { chave, rotulo: `Até ${ate}`, de: null, ate };
      return { chave, rotulo: "Todo o histórico", de: null, ate: null };
    }
    default:
      return { chave: "mes", rotulo: "Este mês", de: atual, ate: atual };
  }
}

function noPeriodo(competencia: string | null | undefined, periodo: Periodo) {
  if (!periodo.de && !periodo.ate) return true;
  const comp = String(competencia || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(comp)) return false;
  if (periodo.de && comp < periodo.de) return false;
  if (periodo.ate && comp > periodo.ate) return false;
  return true;
}

function formatarData(valor: string | null | undefined) {
  if (!valor) return "—";
  const [ano, mes, dia] = valor.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

function rotuloImovel(imovel: Registro | null | undefined) {
  if (!imovel) return "—";
  const partes = [imovel.logradouro, imovel.numero, imovel.bairro].filter(Boolean);
  return partes.length ? partes.join(", ") : imovel.codigo || "—";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filtros = await searchParams;
  const periodo = resolverPeriodo(filtros);
  
  // Atualiza status de atrasados antes de buscar os dados
  await atualizarAtrasados();
  
  const supabase = await createClient();

  const [
    { data: pagamentos },
    { data: imoveis },
    { data: contratos },
    { data: contas },
    { data: manutencoes },
  ] = await Promise.all([
    supabase.from("pagamentos").select(`
      id, competencia, data_vencimento, data_pagamento, valor_base, valor_pago, status,
      contratos ( id, ativo, inquilinos ( nome ), imoveis ( id, codigo, logradouro, numero, bairro ) )
    `).order("data_vencimento", { ascending: false }),
    supabase.from("imoveis").select("id, codigo, status, valor_aluguel, logradouro, numero, bairro, cidade"),
    supabase.from("contratos").select("id, ativo, data_fim, valor_atual, valor_aluguel, inquilinos ( nome ), imoveis ( codigo, logradouro, numero )"),
    supabase.from("contas_consumo").select("id, tipo, competencia, valor, paga, imoveis ( codigo, logradouro, numero )"),
    supabase.from("manutencoes").select("id, tipo, descricao, status, data_solicitacao, imoveis ( codigo, logradouro, numero )"),
  ]);

  const listaPagamentos = ((pagamentos ?? []) as Registro[]).filter((p) => noPeriodo(p.competencia, periodo));
  const listaImoveis = (imoveis ?? []) as Registro[];
  const listaContratos = (contratos ?? []) as Registro[];
  const listaContas = ((contas ?? []) as Registro[]).filter((c) => noPeriodo(c.competencia, periodo));
  const listaManutencoes = ((manutencoes ?? []) as Registro[]).filter((m) => noPeriodo(m.data_solicitacao, periodo));

  // ---- Indicadores financeiros (pagamentos no período) ----
  const pagos = listaPagamentos.filter((p) => p.status === "pago");
  const pendentes = listaPagamentos.filter((p) => p.status === "pendente");
  const atrasados = listaPagamentos.filter((p) => p.status === "atrasado");

  const totalRecebido = pagos.reduce((acc, p) => acc + Number(p.valor_pago || 0), 0);
  const totalAReceber = pendentes.reduce((acc, p) => acc + Number(p.valor_base || 0), 0);
  const totalAtrasado = atrasados.reduce((acc, p) => acc + Number(p.valor_base || 0), 0);

  // ---- Indicadores de portfólio ----
  const statusNormalizado = (s: unknown) => String(s || "").toLowerCase();
  const imoveisAlugados = listaImoveis.filter((i) => statusNormalizado(i.status) === "alugado");
  const imoveisDisponiveis = listaImoveis.filter((i) => ["disponivel", "disponível"].includes(statusNormalizado(i.status)));
  const contratosAtivos = listaContratos.filter((c) => c.ativo !== false);
  const contasPendentes = listaContas.filter((c) => !c.paga);
  const totalContasPendentes = contasPendentes.reduce((acc, c) => acc + Number(c.valor || 0), 0);
  const manutencoesAbertas = listaManutencoes.filter((m) => ["aberta", "em_andamento"].includes(statusNormalizado(m.status)));

  // Receita potencial mensal: soma dos aluguéis dos contratos ativos
  const receitaContratosAtivos = contratosAtivos.reduce((acc, c) => acc + Number(c.valor_aluguel ?? c.valor_atual ?? 0), 0);

  // ---- Listas para exibição ----
  const proximosVencimentos = listaPagamentos
    .filter((p) => p.status === "pendente" || p.status === "atrasado")
    .sort((a, b) => String(a.data_vencimento || "").localeCompare(String(b.data_vencimento || "")))
    .slice(0, 6);

  const ultimosRecebimentos = [...pagos]
    .sort((a, b) => String(b.data_pagamento || b.data_vencimento || "").localeCompare(String(a.data_pagamento || a.data_vencimento || "")))
    .slice(0, 6);

  const contasPendentesRecentes = [...contasPendentes]
    .sort((a, b) => String(b.competencia || "").localeCompare(String(a.competencia || "")))
    .slice(0, 5);

  const manutencoesRecentes = [...listaManutencoes]
    .sort((a, b) => String(b.data_solicitacao || "").localeCompare(String(a.data_solicitacao || "")))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel Geral"
        subtitle="Visão geral da carteira de imóveis, contratos e recebimentos"
      />

      <FiltrosPeriodo
        periodo={periodo.chave}
        rotulo={periodo.rotulo}
        de={typeof filtros.de === "string" ? filtros.de : ""}
        ate={typeof filtros.ate === "string" ? filtros.ate : ""}
      />

      {/* Indicadores financeiros */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
            Recebido no período
          </span>
          <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--color-ok)" }}>
            <Money value={totalRecebido} />
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>
            {pagos.length} pagamento(s) recebido(s)
          </p>
        </Card>

        <Card>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
            A receber (pendente)
          </span>
          <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--color-warn)" }}>
            <Money value={totalAReceber} />
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>
            {pendentes.length} pagamento(s) em aberto
          </p>
        </Card>

        <Card>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
            Atrasado
          </span>
          <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--color-alert)" }}>
            <Money value={totalAtrasado} />
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>
            {atrasados.length} pagamento(s) vencido(s)
          </p>
        </Card>

        <Card>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
            Receita contratada / mês
          </span>
          <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--color-ink)" }}>
            <Money value={receitaContratosAtivos} />
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>
            {contratosAtivos.length} contrato(s) ativo(s)
          </p>
        </Card>
      </div>

      {/* Indicadores de portfólio */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
            Imóveis
          </span>
          <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--color-ink)" }}>
            {listaImoveis.length}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>
            {imoveisAlugados.length} alugado(s) · {imoveisDisponiveis.length} disponível(is)
          </p>
        </Card>

        <Card>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
            Contas de consumo pendentes
          </span>
          <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--color-warn)" }}>
            {contasPendentes.length}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>
            Total: <Money value={totalContasPendentes} />
          </p>
        </Card>

        <Card>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
            Manutenções em aberto
          </span>
          <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--color-warn)" }}>
            {manutencoesAbertas.length}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>
            {listaManutencoes.length} registro(s) no período
          </p>
        </Card>

        <Card>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
            Inquilinos com contrato
          </span>
          <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--color-ink)" }}>
            {new Set(listaContratos.filter((c) => c.ativo !== false && c.inquilinos?.nome).map((c) => c.inquilinos.nome)).size}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>
            em contratos ativos no sistema
          </p>
        </Card>
      </div>

      {/* Próximos vencimentos e últimos recebimentos */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
            Próximos vencimentos
          </h2>
          <Table head={["Vencimento", "Imóvel", "Inquilino", "Valor", "Status"]}>
            {proximosVencimentos.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center" colSpan={5} style={{ color: "var(--color-ink-soft)" }}>
                  Nenhum vencimento em aberto.
                </td>
              </tr>
            ) : (
              proximosVencimentos.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0" style={{ borderColor: "var(--color-line)" }}>
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatarData(p.data_vencimento)}</td>
                  <td className="px-4 py-2.5">{rotuloImovel(p.contratos?.imoveis)}</td>
                  <td className="px-4 py-2.5">{p.contratos?.inquilinos?.nome || "—"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap"><Money value={p.valor_base} /></td>
                  <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                </tr>
              ))
            )}
          </Table>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
            Últimos recebimentos
          </h2>
          <Table head={["Pagamento", "Imóvel", "Inquilino", "Valor", "Status"]}>
            {ultimosRecebimentos.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center" colSpan={5} style={{ color: "var(--color-ink-soft)" }}>
                  Nenhum recebimento registrado ainda.
                </td>
              </tr>
            ) : (
              ultimosRecebimentos.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0" style={{ borderColor: "var(--color-line)" }}>
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatarData(p.data_pagamento || p.data_vencimento)}</td>
                  <td className="px-4 py-2.5">{rotuloImovel(p.contratos?.imoveis)}</td>
                  <td className="px-4 py-2.5">{p.contratos?.inquilinos?.nome || "—"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap"><Money value={p.valor_pago || p.valor_base} /></td>
                  <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                </tr>
              ))
            )}
          </Table>
        </section>
      </div>

      {/* Contas de consumo e manutenções */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
            Contas de consumo pendentes
          </h2>
          <Table head={["Imóvel", "Tipo", "Competência", "Valor"]}>
            {contasPendentesRecentes.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center" colSpan={4} style={{ color: "var(--color-ink-soft)" }}>
                  Todas as contas estão pagas.
                </td>
              </tr>
            ) : (
              contasPendentesRecentes.map((c) => (
                <tr key={c.id} className="border-b last:border-b-0" style={{ borderColor: "var(--color-line)" }}>
                  <td className="px-4 py-2.5">{rotuloImovel(c.imoveis)}</td>
                  <td className="px-4 py-2.5">{c.tipo || "—"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{c.competencia || "—"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap"><Money value={c.valor} /></td>
                </tr>
              ))
            )}
          </Table>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
            Manutenções recentes
          </h2>
          <Table head={["Imóvel", "Tipo", "Solicitação", "Status"]}>
            {manutencoesRecentes.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center" colSpan={4} style={{ color: "var(--color-ink-soft)" }}>
                  Nenhuma manutenção registrada.
                </td>
              </tr>
            ) : (
              manutencoesRecentes.map((m) => (
                <tr key={m.id} className="border-b last:border-b-0" style={{ borderColor: "var(--color-line)" }}>
                  <td className="px-4 py-2.5">{rotuloImovel(m.imoveis)}</td>
                  <td className="px-4 py-2.5">{m.tipo || "—"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatarData(m.data_solicitacao)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={m.status} /></td>
                </tr>
              ))
            )}
          </Table>
        </section>
      </div>
    </div>
  );
}
