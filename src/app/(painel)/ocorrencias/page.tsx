import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, StatusBadge, Table } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { FormCriarOcorrencia } from "./form-criar-ocorrencia";
import { atualizarStatusOcorrencia, excluirOcorrencia } from "./actions";

const TIPOS_OCORRENCIA = [
  { value: "manutencao", label: "Manutenção" },
  { value: "reclamacao", label: "Reclamação" },
  { value: "atraso_pagamento", label: "Atraso de pagamento" },
  { value: "vizinhanca", label: "Vizinhança" },
  { value: "outro", label: "Outro" },
];

const GRAVIDADES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

const STATUS_OCORRENCIA = [
  { value: "aberta", label: "Aberta" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "resolvida", label: "Resolvida" },
  { value: "cancelada", label: "Cancelada" },
];

function formatarDataBR(valor: string | null): string {
  if (!valor) return "—";
  const data = valor.includes("T") ? valor : `${valor}T00:00:00`;
  return new Date(data).toLocaleDateString("pt-BR");
}

function rotuloTipo(tipo: string | null): string {
  return TIPOS_OCORRENCIA.find((t) => t.value === tipo)?.label ?? tipo ?? "—";
}

export default async function OcorrenciasPage() {
  const supabase = await createClient();

  const [{ data: ocorrencias }, { data: contratos }, { data: imoveis }] = await Promise.all([
    supabase
      .from("ocorrencias")
      .select("id, contrato_id, imovel_id, tipo, gravidade, status, descricao, data_ocorrencia, resolvida_em, contratos(codigo, inquilinos(nome)), imoveis(logradouro, numero, bairro, cidade)")
      .order("data_ocorrencia", { ascending: false }),
    supabase
      .from("contratos")
      .select("id, codigo, ativo, inquilinos(nome), imoveis(logradouro, numero, bairro, cidade)")
      .order("created_at", { ascending: false }),
    supabase
      .from("imoveis")
      .select("id, logradouro, numero, bairro, cidade")
      .order("logradouro", { ascending: true }),
  ]);

  const listaOcorrencias = ocorrencias ?? [];
  const listaContratos = contratos ?? [];
  const listaImoveis = imoveis ?? [];

  const contratosFormatados = listaContratos.map((c) => {
    const inquilino = Array.isArray(c.inquilinos) ? c.inquilinos[0]?.nome : (c.inquilinos as unknown as { nome: string } | null)?.nome ?? null;
    const imovel = Array.isArray(c.imoveis)
      ? c.imoveis[0]
      : (c.imoveis as unknown as { logradouro: string | null; numero: string | null; bairro: string | null; cidade: string } | null);
    const enderecoImovel = imovel ? [imovel.logradouro, imovel.numero].filter(Boolean).join(", ") : null;
    return { id: c.id, codigo: c.codigo, inquilino, imovel: enderecoImovel };
  });

  const imoveisFormatados = listaImoveis.map((i) => ({
    id: i.id,
    endereco: [i.logradouro, i.numero].filter(Boolean).join(", ") || "Imóvel sem endereço",
  }));

  const abertas = listaOcorrencias.filter((o) => o.status === "aberta" || o.status === "em_andamento");
  const resolvidas = listaOcorrencias.filter((o) => o.status === "resolvida" || o.status === "cancelada");

  return (
    <div>
      <PageHeader title="Ocorrências" subtitle="Registro de eventos, solicitações e incidentes por contrato e imóvel." />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              Nova ocorrência
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
              Registre reclamações, manutenções solicitadas e outros eventos do dia a dia.
            </p>
          </div>
          <FormCriarOcorrencia contratos={contratosFormatados} imoveis={imoveisFormatados} />
        </div>
      </Card>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-soft)" }}>
          Pendentes ({abertas.length})
        </h2>
        <Table head={["Data", "Tipo", "Descrição", "Contrato/Imóvel", "Gravidade", "Status", ""]}>
          {abertas.map((o) => {
            const contrato = Array.isArray(o.contratos) ? o.contratos[0] : (o.contratos as unknown as { codigo: string | null; inquilinos: unknown } | null);
            const inquilino = contrato
              ? Array.isArray(contrato.inquilinos)
                ? (contrato.inquilinos[0] as { nome: string } | undefined)?.nome
                : (contrato.inquilinos as unknown as { nome: string } | null)?.nome
              : null;
            const imovel = Array.isArray(o.imoveis)
              ? o.imoveis[0]
              : (o.imoveis as unknown as { logradouro: string | null; numero: string | null } | null);
            return (
              <tr key={o.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                <td className="px-4 py-2.5 whitespace-nowrap">{formatarDataBR(o.data_ocorrencia)}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">{rotuloTipo(o.tipo)}</td>
                <td className="px-4 py-2.5 max-w-md">{o.descricao}</td>
                <td className="px-4 py-2.5">
                  {contrato?.codigo ? (
                    <span>
                      {contrato.codigo}
                      {inquilino ? ` — ${inquilino}` : ""}
                    </span>
                  ) : imovel ? (
                    <span>{[imovel.logradouro, imovel.numero].filter(Boolean).join(", ")}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={o.gravidade} />
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <form action={atualizarStatusOcorrencia}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="status" value={o.status === "aberta" ? "em_andamento" : "resolvida"} />
                      <button
                        type="submit"
                        className="text-xs font-medium underline cursor-pointer"
                        style={{ color: "var(--color-teal)" }}
                      >
                        {o.status === "aberta" ? "Iniciar" : "Resolver"}
                      </button>
                    </form>
                    <form action={excluirOcorrencia}>
                      <input type="hidden" name="id" value={o.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium underline cursor-pointer"
                        style={{ color: "var(--color-alert)" }}
                      >
                        Excluir
                      </button>
                    </form>
                    <RecordEditor
                      entity="ocorrencias"
                      id={o.id}
                      fields={[
                        { name: "tipo", label: "Tipo", kind: "select", value: o.tipo, options: TIPOS_OCORRENCIA },
                        { name: "gravidade", label: "Gravidade", kind: "select", value: o.gravidade, options: GRAVIDADES },
                        { name: "status", label: "Status", kind: "select", value: o.status, options: STATUS_OCORRENCIA },
                        { name: "data_ocorrencia", label: "Data da ocorrência", value: o.data_ocorrencia, type: "date" },
                        { name: "resolvida_em", label: "Resolvida em", value: o.resolvida_em, type: "date" },
                        { name: "descricao", label: "Descrição", value: o.descricao, kind: "textarea", required: true },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-soft)" }}>
          Resolvidas e canceladas ({resolvidas.length})
        </h2>
        <Table head={["Data", "Tipo", "Descrição", "Contrato/Imóvel", "Gravidade", "Status", ""]}>
          {resolvidas.map((o) => {
            const contrato = Array.isArray(o.contratos) ? o.contratos[0] : (o.contratos as unknown as { codigo: string | null; inquilinos: unknown } | null);
            const inquilino = contrato
              ? Array.isArray(contrato.inquilinos)
                ? (contrato.inquilinos[0] as { nome: string } | undefined)?.nome
                : (contrato.inquilinos as unknown as { nome: string } | null)?.nome
              : null;
            const imovel = Array.isArray(o.imoveis)
              ? o.imoveis[0]
              : (o.imoveis as unknown as { logradouro: string | null; numero: string | null } | null);
            return (
              <tr key={o.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                <td className="px-4 py-2.5 whitespace-nowrap">{formatarDataBR(o.data_ocorrencia)}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">{rotuloTipo(o.tipo)}</td>
                <td className="px-4 py-2.5 max-w-md">{o.descricao}</td>
                <td className="px-4 py-2.5">
                  {contrato?.codigo ? (
                    <span>
                      {contrato.codigo}
                      {inquilino ? ` — ${inquilino}` : ""}
                    </span>
                  ) : imovel ? (
                    <span>{[imovel.logradouro, imovel.numero].filter(Boolean).join(", ")}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={o.gravidade} />
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <form action={excluirOcorrencia}>
                      <input type="hidden" name="id" value={o.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium underline cursor-pointer"
                        style={{ color: "var(--color-alert)" }}
                      >
                        Excluir
                      </button>
                    </form>
                    <RecordEditor
                      entity="ocorrencias"
                      id={o.id}
                      fields={[
                        { name: "tipo", label: "Tipo", kind: "select", value: o.tipo, options: TIPOS_OCORRENCIA },
                        { name: "gravidade", label: "Gravidade", kind: "select", value: o.gravidade, options: GRAVIDADES },
                        { name: "status", label: "Status", kind: "select", value: o.status, options: STATUS_OCORRENCIA },
                        { name: "data_ocorrencia", label: "Data da ocorrência", value: o.data_ocorrencia, type: "date" },
                        { name: "resolvida_em", label: "Resolvida em", value: o.resolvida_em, type: "date" },
                        { name: "descricao", label: "Descrição", value: o.descricao, kind: "textarea", required: true },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </div>
    </div>
  );
}
