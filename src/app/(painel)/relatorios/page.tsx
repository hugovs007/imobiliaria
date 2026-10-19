import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { Card, Money, PageHeader, StatusBadge, Table } from "@/components/ui";
import { FiltrosRelatorio } from "./filtros-relatorio";
import { formatCurrency } from "./export-utils";
import { RelatorioAcoes } from "./RelatorioAcoes";
import { ReportDate } from "./report-date";

type Registro = Record<string, any>;

const TIPOS_VALIDOS = ["recebimentos", "inadimplencia", "informe", "imoveis", "contratos", "contas", "manutencoes"] as const;
const TIPOS_COM_PERIODO = ["recebimentos", "inadimplencia", "informe", "contas", "manutencoes"] as const;

type TipoRelatorio = typeof TIPOS_VALIDOS[number];
type TipoComPeriodo = typeof TIPOS_COM_PERIODO[number];

function mesCompetenciaAtual(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function subtrairMeses(base: string, quantidade: number): string {
  const [ano, mes] = base.split("-").map(Number);
  const data = new Date(ano, mes - 1 - quantidade, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function mesValido(valor: unknown): string | null {
  return typeof valor === "string" && /^\d{4}-\d{2}$/.test(valor) ? valor : null;
}

function noPeriodo(competencia: string | null | undefined, de: string, ate: string): boolean {
  const comp = String(competencia || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(comp)) return false;
  return comp >= de && comp <= ate;
}

function formatarData(valor: string | null | undefined): string {
  if (!valor) return "—";
  const [ano, mes, dia] = valor.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarCompetencia(valor: string | null | undefined): string {
  const comp = String(valor || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(comp)) return "—";
  const [ano, mes] = comp.split("-");
  return `${mes}/${ano}`;
}

function rotuloImovel(imovel: Registro | null | undefined): string {
  if (!imovel) return "—";
  const partes = [imovel.logradouro, imovel.numero, imovel.bairro].filter(Boolean);
  return partes.length ? partes.join(", ") : imovel.codigo || "—";
}

function LinhaVazia({ colunas, mensagem }: { colunas: number; mensagem: string }) {
  return (
    <tr>
      <td className="px-4 py-6 text-center" colSpan={colunas} style={{ color: "var(--color-ink-soft)" }}>
        {mensagem}
      </td>
    </tr>
  );
}

const classeLinha = "border-b last:border-b-0";
const estiloLinha = { borderColor: "var(--color-line)" };
const classeCelula = "px-4 py-2.5";

/** Extrai texto de uma célula JSX (string, Money, StatusBadge ou aninhados) para o CSV. */
function extrairTextoCelula(celula: any): string {
  if (celula == null || celula === false) return "";
  if (typeof celula === "string" || typeof celula === "number") return String(celula);
  const props = celula.props ?? {};
  if (typeof props.value === "number") return formatCurrency(props.value);
  if (props.value === null || props.value === undefined) {
    if ("value" in props) return "—";
  }
  if (typeof props.status === "string") return props.status.replace(/_/g, " ");
  if (props.children != null) {
    if (typeof props.children === "string" || typeof props.children === "number") return String(props.children);
    if (Array.isArray(props.children)) {
      return props.children.map((child: any) => extrairTextoCelula(child)).join("");
    }
    return extrairTextoCelula(props.children);
  }
  return "";
}

interface RelatorioData {
  titulo: string;
  resumo: { rotulo: string; valor: ReactNode }[];
  cabecalho: string[];
  linhas: ReactNode[];
}

async function buscarDadosRelatorio(
  supabase: any,
  tipo: TipoRelatorio,
  de: string,
  ate: string
): Promise<RelatorioData> {
  let pagamentos: Registro[] = [];
  let imoveis: Registro[] = [];
  let contratos: Registro[] = [];
  let contas: Registro[] = [];
  let manutencoes: Registro[] = [];

  if (tipo === "recebimentos" || tipo === "inadimplencia" || tipo === "informe") {
    const { data } = await supabase
      .from("pagamentos")
      .select(`
        id, competencia, data_vencimento, data_pagamento, valor_base, valor_pago, status,
        contratos ( id, ativo, inquilinos ( nome ), imoveis ( id, codigo, logradouro, numero, bairro, proprietarios ( nome ) ) )
      `)
      .order("competencia", { ascending: true });
    pagamentos = ((data ?? []) as Registro[]).filter((p) => noPeriodo(p.competencia, de, ate));
  } else if (tipo === "imoveis") {
    const { data } = await supabase
      .from("imoveis")
      .select("id, codigo, tipo, status, valor_aluguel, logradouro, numero, bairro, cidade")
      .order("codigo", { ascending: true });
    imoveis = (data ?? []) as Registro[];
  } else if (tipo === "contratos") {
    const { data } = await supabase
      .from("contratos")
      .select("id, codigo, ativo, data_inicio, data_fim, dia_vencimento, valor_atual, valor_aluguel, inquilinos ( nome ), imoveis ( codigo, logradouro, numero )")
      .order("data_inicio", { ascending: true });
    contratos = ((data ?? []) as Registro[]).filter((c) => c.ativo !== false);
  } else if (tipo === "contas") {
    const { data } = await supabase
      .from("contas_consumo")
      .select("id, tipo, competencia, valor, responsavel, paga, imoveis ( codigo, logradouro, numero )")
      .order("competencia", { ascending: true });
    contas = ((data ?? []) as Registro[]).filter((c) => noPeriodo(c.competencia, de, ate));
  } else if (tipo === "manutencoes") {
    const { data } = await supabase
      .from("manutencoes")
      .select("id, tipo, descricao, custo_estimado, custo_final, status, data_solicitacao, data_conclusao, imoveis ( codigo, logradouro, numero )")
      .order("data_solicitacao", { ascending: true });
    manutencoes = ((data ?? []) as Registro[]).filter((m) => noPeriodo(m.data_solicitacao, de, ate));
  }

  let titulo = "";
  let resumo: { rotulo: string; valor: ReactNode }[] = [];
  let cabecalho: string[] = [];
  let linhas: ReactNode[] = [];

  const normalizar = (s: unknown) => String(s || "").toLowerCase();

  if (tipo === "recebimentos") {
    titulo = "Relatório de Recebimentos";
    const pagos = pagamentos.filter((p) => p.status === "pago");
    const pendentes = pagamentos.filter((p) => p.status === "pendente");
    const atrasados = pagamentos.filter((p) => p.status === "atrasado");
    resumo = [
      { rotulo: "Recebido", valor: <Money value={pagos.reduce((acc, p) => acc + Number(p.valor_pago || 0), 0)} /> },
      { rotulo: "A receber", valor: <Money value={pendentes.reduce((acc, p) => acc + Number(p.valor_base || 0), 0)} /> },
      { rotulo: "Atrasado", valor: <Money value={atrasados.reduce((acc, p) => acc + Number(p.valor_base || 0), 0)} /> },
      { rotulo: "Registros", valor: String(pagamentos.length) },
    ];
    cabecalho = ["Competência", "Vencimento", "Pagamento", "Imóvel", "Inquilino", "Valor base", "Valor pago", "Status"];
    linhas = pagamentos.length === 0
      ? [<LinhaVazia key="vazio" colunas={8} mensagem="Nenhum pagamento no período." />]
      : pagamentos.map((p) => (
          <tr key={p.id} className={classeLinha} style={estiloLinha}>
            <td className={`${classeCelula} whitespace-nowrap`}>{formatarCompetencia(p.competencia)}</td>
            <td className={`${classeCelula} whitespace-nowrap`}>{formatarData(p.data_vencimento)}</td>
            <td className={`${classeCelula} whitespace-nowrap`}>{formatarData(p.data_pagamento)}</td>
            <td className={classeCelula}>{rotuloImovel(p.contratos?.imoveis)}</td>
            <td className={classeCelula}>{p.contratos?.inquilinos?.nome || "—"}</td>
            <td className={`${classeCelula} whitespace-nowrap`}><Money value={p.valor_base} /></td>
            <td className={`${classeCelula} whitespace-nowrap`}><Money value={p.valor_pago} /></td>
            <td className={classeCelula}><StatusBadge status={p.status} /></td>
          </tr>
        ));
  } else if (tipo === "inadimplencia") {
    titulo = "Relatório de Inadimplência";
    const emAberto = pagamentos.filter((p) => p.status === "pendente" || p.status === "atrasado");
    const atrasados = pagamentos.filter((p) => p.status === "atrasado");
    resumo = [
      { rotulo: "Total em aberto", valor: <Money value={emAberto.reduce((acc, p) => acc + Number(p.valor_base || 0), 0)} /> },
      { rotulo: "Total atrasado", valor: <Money value={atrasados.reduce((acc, p) => acc + Number(p.valor_base || 0), 0)} /> },
      { rotulo: "Em aberto", valor: String(emAberto.length) },
      { rotulo: "Vencidos", valor: String(atrasados.length) },
    ];
    cabecalho = ["Imóvel", "Inquilino", "Competência", "Vencimento", "Valor", "Status"];
    linhas = emAberto.length === 0
      ? [<LinhaVazia key="vazio" colunas={6} mensagem="Nenhum pagamento em aberto no período." />]
      : [...emAberto]
          .sort((a, b) => String(a.data_vencimento || "").localeCompare(String(b.data_vencimento || "")))
          .map((p) => (
            <tr key={p.id} className={classeLinha} style={estiloLinha}>
              <td className={classeCelula}>{rotuloImovel(p.contratos?.imoveis)}</td>
              <td className={classeCelula}>{p.contratos?.inquilinos?.nome || "—"}</td>
              <td className={`${classeCelula} whitespace-nowrap`}>{formatarCompetencia(p.competencia)}</td>
              <td className={`${classeCelula} whitespace-nowrap`}>{formatarData(p.data_vencimento)}</td>
              <td className={`${classeCelula} whitespace-nowrap`}><Money value={p.valor_base} /></td>
              <td className={classeCelula}><StatusBadge status={p.status} /></td>
            </tr>
          ));
  } else if (tipo === "informe") {
    titulo = "Informe de Rendimentos";
    const pagos = pagamentos.filter((p) => p.status === "pago");

    // Despesas dedutíveis: contas de consumo de responsabilidade do proprietário
    const { data: contasProp } = await supabase
      .from("contas_consumo")
      .select("id, tipo, competencia, valor, responsavel, imoveis ( id, codigo, logradouro, numero, bairro )")
      .order("competencia", { ascending: true });
    const contasProprietario = ((contasProp ?? []) as Registro[])
      .filter((c) => noPeriodo(c.competencia, de, ate))
      .filter((c) => normalizar(c.responsavel).includes("propriet"));

    // Despesas dedutíveis: manutenções concluídas no período
    const { data: manutPeriodo } = await supabase
      .from("manutencoes")
      .select("id, tipo, descricao, custo_estimado, custo_final, status, data_solicitacao, imoveis ( id, codigo, logradouro, numero, bairro )")
      .order("data_solicitacao", { ascending: true });
    const manutencoesPeriodo = ((manutPeriodo ?? []) as Registro[])
      .filter((m) => noPeriodo(m.data_solicitacao, de, ate))
      .filter((m) => ["concluida", "concluída"].includes(normalizar(m.status)));

    // Agrupa por imóvel
    const porImovel = new Map<string, {
      imovel: Registro | null;
      proprietario: string;
      aluguelRecebido: number;
      contas: number;
      manutencoes: number;
    }>();

    function garantirEntrada(imovel: Registro | null | undefined): {
      imovel: Registro | null;
      proprietario: string;
      aluguelRecebido: number;
      contas: number;
      manutencoes: number;
    } {
      const chave = imovel?.id ?? "sem-imovel";
      if (!porImovel.has(chave)) {
        porImovel.set(chave, {
          imovel: imovel ?? null,
          proprietario: (imovel?.proprietarios as { nome: string } | null)?.nome ?? "—",
          aluguelRecebido: 0,
          contas: 0,
          manutencoes: 0,
        });
      }
      return porImovel.get(chave)!;
    }

    for (const p of pagos) {
      const entrada = garantirEntrada(p.contratos?.imoveis);
      entrada.aluguelRecebido += Number(p.valor_pago || 0);
    }
    for (const c of contasProprietario) {
      const entrada = garantirEntrada(c.imoveis);
      entrada.contas += Number(c.valor || 0);
    }
    for (const m of manutencoesPeriodo) {
      const entrada = garantirEntrada(m.imoveis);
      entrada.manutencoes += Number(m.custo_final ?? m.custo_estimado ?? 0);
    }

    const entradas = [...porImovel.values()];
    const totalReceitas = entradas.reduce((acc, e) => acc + e.aluguelRecebido, 0);
    const totalContas = entradas.reduce((acc, e) => acc + e.contas, 0);
    const totalManut = entradas.reduce((acc, e) => acc + e.manutencoes, 0);

    resumo = [
      { rotulo: "Rendimentos (aluguéis)", valor: <Money value={totalReceitas} /> },
      { rotulo: "Contas do proprietário", valor: <Money value={totalContas} /> },
      { rotulo: "Manutenções", valor: <Money value={totalManut} /> },
      { rotulo: "Rendimento líquido", valor: <Money value={totalReceitas - totalContas - totalManut} /> },
    ];
    cabecalho = ["Imóvel", "Proprietário", "Aluguéis recebidos", "Contas (proprietário)", "Manutenções", "Rendimento líquido"];
    linhas = entradas.length === 0
      ? [<LinhaVazia key="vazio" colunas={6} mensagem="Nenhum rendimento no período." />]
      : entradas.map((e, idx) => (
          <tr key={e.imovel?.id ?? `sem-imovel-${idx}`} className={classeLinha} style={estiloLinha}>
            <td className={classeCelula}>{rotuloImovel(e.imovel)}</td>
            <td className={classeCelula}>{e.proprietario}</td>
            <td className={`${classeCelula} whitespace-nowrap`}><Money value={e.aluguelRecebido} /></td>
            <td className={`${classeCelula} whitespace-nowrap`}><Money value={e.contas} /></td>
            <td className={`${classeCelula} whitespace-nowrap`}><Money value={e.manutencoes} /></td>
            <td className={`${classeCelula} whitespace-nowrap font-semibold`}>
              <Money value={e.aluguelRecebido - e.contas - e.manutencoes} />
            </td>
          </tr>
        ));
  } else if (tipo === "imoveis") {
    titulo = "Relatório de Imóveis";
    const alugados = imoveis.filter((i) => normalizar(i.status) === "alugado");
    const disponiveis = imoveis.filter((i) => ["disponivel", "disponível"].includes(normalizar(i.status)));
    resumo = [
      { rotulo: "Total de imóveis", valor: String(imoveis.length) },
      { rotulo: "Alugados", valor: String(alugados.length) },
      { rotulo: "Disponíveis", valor: String(disponiveis.length) },
      { rotulo: "Receita potencial", valor: <Money value={imoveis.reduce((acc, i) => acc + Number(i.valor_aluguel || 0), 0)} /> },
    ];
    cabecalho = ["Código", "Endereço", "Cidade", "Tipo", "Status", "Valor aluguel"];
    linhas = imoveis.length === 0
      ? [<LinhaVazia key="vazio" colunas={6} mensagem="Nenhum imóvel cadastrado." />]
      : imoveis.map((i) => (
          <tr key={i.id} className={classeLinha} style={estiloLinha}>
            <td className={`${classeCelula} whitespace-nowrap`}>{i.codigo || "—"}</td>
            <td className={classeCelula}>{rotuloImovel(i)}</td>
            <td className={classeCelula}>{i.cidade || "—"}</td>
            <td className={classeCelula}>{i.tipo || "—"}</td>
            <td className={classeCelula}><StatusBadge status={i.status} /></td>
            <td className={`${classeCelula} whitespace-nowrap`}><Money value={i.valor_aluguel} /></td>
          </tr>
        ));
  } else if (tipo === "contratos") {
    titulo = "Relatório de Contratos Ativos";
    resumo = [
      { rotulo: "Contratos ativos", valor: String(contratos.length) },
      {
        rotulo: "Receita mensal contratada",
        valor: <Money value={contratos.reduce((acc, c) => acc + Number(c.valor_aluguel ?? c.valor_atual ?? 0), 0)} />,
      },
    ];
    cabecalho = ["Código", "Inquilino", "Imóvel", "Início", "Fim", "Vencimento", "Valor mensal"];
    linhas = contratos.length === 0
      ? [<LinhaVazia key="vazio" colunas={7} mensagem="Nenhum contrato ativo." />]
      : contratos.map((c) => (
          <tr key={c.id} className={classeLinha} style={estiloLinha}>
            <td className={`${classeCelula} whitespace-nowrap`}>{c.codigo || String(c.id).slice(0, 8)}</td>
            <td className={classeCelula}>{c.inquilinos?.nome || "—"}</td>
            <td className={classeCelula}>{rotuloImovel(c.imoveis)}</td>
            <td className={`${classeCelula} whitespace-nowrap`}>{formatarData(c.data_inicio)}</td>
            <td className={`${classeCelula} whitespace-nowrap`}>{formatarData(c.data_fim)}</td>
            <td className={`${classeCelula} whitespace-nowrap`}>{c.dia_vencimento ? `Dia ${c.dia_vencimento}` : "—"}</td>
            <td className={`${classeCelula} whitespace-nowrap`}><Money value={c.valor_aluguel ?? c.valor_atual} /></td>
          </tr>
        ));
  } else if (tipo === "contas") {
    titulo = "Relatório de Contas de Consumo";
    const pagas = contas.filter((c) => c.paga);
    const pendentesConsumo = contas.filter((c) => !c.paga);
    resumo = [
      { rotulo: "Contas no período", valor: String(contas.length) },
      { rotulo: "Total", valor: <Money value={contas.reduce((acc, c) => acc + Number(c.valor || 0), 0)} /> },
      { rotulo: "Pago", valor: <Money value={pagas.reduce((acc, c) => acc + Number(c.valor || 0), 0)} /> },
      { rotulo: "Pendente", valor: <Money value={pendentesConsumo.reduce((acc, c) => acc + Number(c.valor || 0), 0)} /> },
    ];
    cabecalho = ["Imóvel", "Tipo", "Competência", "Responsável", "Valor", "Situação"];
    linhas = contas.length === 0
      ? [<LinhaVazia key="vazio" colunas={6} mensagem="Nenhuma conta de consumo no período." />]
      : contas.map((c) => (
          <tr key={c.id} className={classeLinha} style={estiloLinha}>
            <td className={classeCelula}>{rotuloImovel(c.imoveis)}</td>
            <td className={classeCelula}>{c.tipo || "—"}</td>
            <td className={`${classeCelula} whitespace-nowrap`}>{formatarCompetencia(c.competencia)}</td>
            <td className={classeCelula}>{c.responsavel || "—"}</td>
            <td className={`${classeCelula} whitespace-nowrap`}><Money value={c.valor} /></td>
            <td className={classeCelula}><StatusBadge status={c.paga ? "pago" : "pendente"} /></td>
          </tr>
        ));
  } else {
    titulo = "Relatório de Manutenções";
    const abertas = manutencoes.filter((m) => ["aberta", "em_andamento"].includes(normalizar(m.status)));
    const concluidas = manutencoes.filter((m) => ["concluida", "concluída"].includes(normalizar(m.status)));
    resumo = [
      { rotulo: "Registros no período", valor: String(manutencoes.length) },
      { rotulo: "Em aberto", valor: String(abertas.length) },
      { rotulo: "Concluídas", valor: String(concluidas.length) },
      {
        rotulo: "Custo total",
        valor: <Money value={manutencoes.reduce((acc, m) => acc + Number(m.custo_final ?? m.custo_estimado ?? 0), 0)} />,
      },
    ];
    cabecalho = ["Imóvel", "Tipo", "Descrição", "Solicitação", "Conclusão", "Status", "Custo"];
    linhas = manutencoes.length === 0
      ? [<LinhaVazia key="vazio" colunas={7} mensagem="Nenhuma manutenção no período." />]
      : manutencoes.map((m) => (
          <tr key={m.id} className={classeLinha} style={estiloLinha}>
            <td className={classeCelula}>{rotuloImovel(m.imoveis)}</td>
            <td className={classeCelula}>{m.tipo || "—"}</td>
            <td className={classeCelula}>{m.descricao || "—"}</td>
            <td className={`${classeCelula} whitespace-nowrap`}>{formatarData(m.data_solicitacao)}</td>
            <td className={`${classeCelula} whitespace-nowrap`}>{formatarData(m.data_conclusao)}</td>
            <td className={classeCelula}><StatusBadge status={m.status} /></td>
            <td className={`${classeCelula} whitespace-nowrap`}><Money value={m.custo_final ?? m.custo_estimado} /></td>
          </tr>
        ));
  }

  return { titulo, resumo, cabecalho, linhas };
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filtros = await searchParams;
  const tipoParam = typeof filtros.tipo === "string" ? filtros.tipo : "";
  const tipo = TIPOS_VALIDOS.includes(tipoParam as TipoRelatorio) ? (tipoParam as TipoRelatorio) : "recebimentos";
  const usaPeriodo = TIPOS_COM_PERIODO.includes(tipo as TipoComPeriodo);

  const atual = mesCompetenciaAtual();
  const de = mesValido(filtros.de) ?? subtrairMeses(atual, 11);
  const ate = mesValido(filtros.ate) ?? atual;

  let supabase: any;
  try {
    supabase = await createClient();
  } catch (e) {
    console.error("Failed to create Supabase client:", e);
    return (
      <div className="space-y-6">
        <PageHeader title="Relatórios" subtitle="Erro ao conectar com o banco de dados" />
        <Card className="border-red-500 bg-red-50">
          <p className="text-red-700 p-4">
            Não foi possível conectar ao Supabase. Verifique as variáveis de ambiente.
          </p>
        </Card>
      </div>
    );
  }

  let relatorio: RelatorioData;
  try {
    relatorio = await buscarDadosRelatorio(supabase, tipo, de, ate);
  } catch (e) {
    console.error("Failed to fetch report data:", e);
    return (
      <div className="space-y-6">
        <PageHeader title="Relatórios" subtitle="Erro ao carregar dados" />
        <Card className="border-red-500 bg-red-50">
          <p className="text-red-700 p-4">
            Não foi possível carregar os dados do relatório. Tente novamente mais tarde.
          </p>
        </Card>
      </div>
    );
  }

  const { titulo, resumo, cabecalho, linhas } = relatorio;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Emita relatórios por tipo e período; use a impressão do navegador para gerar o PDF"
      />

      <FiltrosRelatorio tipo={tipo} de={de} ate={ate} usaPeriodo={usaPeriodo} />

      <Card className="print:border-0 print:p-0">
        <header
          className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b pb-4"
          style={{ borderColor: "var(--color-line)" }}
        >
          <div>
            <h2 className="font-serif text-xl font-semibold" style={{ color: "var(--color-ink)" }}>
              {titulo}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
              {usaPeriodo
                ? `Período: ${formatarCompetencia(de)} a ${formatarCompetencia(ate)}`
                : "Posição atual da carteira"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
              Emitido em <ReportDate className="print:hidden" />
            </p>
            <RelatorioAcoes
              tipo={tipo}
              titulo={titulo}
              subtitle={
                usaPeriodo
                  ? `Período: ${formatarCompetencia(de)} a ${formatarCompetencia(ate)}`
                  : "Posição atual da carteira"
              }
              headers={cabecalho}
              rows={linhas.map((linha: any) => {
                const filhos = linha?.props?.children;
                if (!Array.isArray(filhos)) return [];
                return filhos.map((c: any) => extrairTextoCelula(c));
              })}
              summary={resumo.map((s) => ({
                label: s.rotulo,
                value: extrairTextoCelula(s.valor),
              }))}
            />
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 summary-grid">
          {resumo.map((item) => (
            <div
              key={item.rotulo}
              className="rounded-sm border px-3 py-2"
              style={{ borderColor: "var(--color-line)" }}
            >
              <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-ink-soft)" }}>
                {item.rotulo}
              </span>
              <p className="mt-1 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
                {item.valor}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <Table head={cabecalho}>{linhas}</Table>
        </div>

        <footer
          className="mt-4 border-t pt-3 text-xs"
          style={{ borderColor: "var(--color-line)", color: "var(--color-ink-soft)" }}
        >
          Documento gerado pelo sistema de Gestão de Aluguéis · {new Date().toLocaleDateString("pt-BR")}
        </footer>
      </Card>
    </div>
  );
}
