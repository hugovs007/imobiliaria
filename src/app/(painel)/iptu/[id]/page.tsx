import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, Money, PageHeader, StatusBadge, Table } from "@/components/ui";
import { formatarData, rotuloImovel } from "@/lib/utils";

interface ImovelCompleto {
  id: string;
  codigo: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string | null;
  tipo: string;
  finalidade: string;
  status: string;
  area_total: number | null;
  area_util: number | null;
  valor_aluguel: number | null;
  valor_condominio: number | null;
  iptu_mensal: number | null;
  matricula: string | null;
  matricula_agua: string | null;
  matricula_luz: string | null;
  observacoes: string | null;
  proprietarios: { nome: string }[];
}

interface IptuComImovel {
  id: string;
  imovel_id: string;
  ano: number;
  parcela: number;
  total_parcelas: number;
  valor_total: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento: string | null;
  valor_pago: number;
  desconto: number;
  multa_juros: number;
  status: string;
  forma_pagamento: string | null;
  comprovante_url: string | null;
  observacoes: string | null;
  imoveis: ImovelCompleto[];
}

async function getComprovanteUrl(supabase: any, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from('arquivos').createSignedUrl(path, 60 * 60); // 1 hora
  return data?.signedUrl || null;
}

export default async function IptuDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: iptu, error } = await supabase
    .from("iptu")
    .select(`
      id, imovel_id, ano, parcela, total_parcelas, valor_total, valor_parcela, data_vencimento, data_pagamento, valor_pago, desconto, multa_juros, status, forma_pagamento, comprovante_url, observacoes,
      imoveis ( id, codigo, logradouro, numero, complemento, bairro, cidade, uf, cep, tipo, finalidade, status, area_total, area_util, valor_aluguel, valor_condominio, iptu_mensal, matricula, matricula_agua, matricula_luz, observacoes, proprietarios(nome) )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !iptu) {
    notFound();
  }

  const iptuData = iptu as IptuComImovel;

  const { data: movimentacoes } = await supabase
    .from("movimentacoes_iptu")
    .select("*")
    .eq("iptu_id", id)
    .order("data_pagamento", { ascending: true });

  // Gera URL assinada para o comprovante
  const comprovanteUrl = await getComprovanteUrl(supabase, iptuData.comprovante_url);

  function LinhaVazia({ colunas, mensagem }: { colunas: number; mensagem: string }) {
    return (
      <tr>
        <td colSpan={colunas} className="px-4 py-8 text-center" style={{ color: "var(--color-ink-soft)" }}>
          {mensagem}
        </td>
      </tr>
    );
  }

  const imovel = iptuData.imoveis?.[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`IPTU ${iptuData.ano} - Parcela ${iptuData.parcela}/${iptuData.total_parcelas}`}
        subtitle={rotuloImovel(imovel)}
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--color-teal)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
                IPTU {iptuData.ano} - Parcela {iptuData.parcela}/{iptuData.total_parcelas}
              </h2>
              <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
                {rotuloImovel(imovel)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={iptuData.status} />
            <a
              href={`/iptu/${iptuData.id}/editar`}
              className="rounded-sm border px-3 py-1.5 text-sm font-medium"
              style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
            >
              Editar
            </a>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
            <Money value={iptuData.valor_parcela} />
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Valor da Parcela
          </div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ok)" }}>
            <Money value={iptuData.valor_pago || 0} />
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Valor Pago
          </div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-warn)" }}>
            <Money value={Math.max(0, Number(iptuData.valor_parcela || 0) - Number(iptuData.valor_pago || 0))} />
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Saldo Devedor
          </div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-alert)" }}>
            {iptuData.multa_juros > 0 ? <Money value={iptuData.multa_juros} /> : "—"}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Multa/Juros
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <h3 className="font-medium mb-4" style={{ color: "var(--color-ink)" }}>
            Informações da Parcela
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <dt style={{ color: "var(--color-ink-soft)" }}>Ano</dt>
              <dd className="font-medium">{iptuData.ano}</dd>
              <dt style={{ color: "var(--color-ink-soft)" }}>Parcela</dt>
              <dd className="font-medium">{iptuData.parcela}/{iptuData.total_parcelas}</dd>
              <dt style={{ color: "var(--color-ink-soft)" }}>Vencimento</dt>
              <dd className="font-medium">{formatarData(iptuData.data_vencimento)}</dd>
              <dt style={{ color: "var(--color-ink-soft)" }}>Pagamento</dt>
              <dd className="font-medium">{formatarData(iptuData.data_pagamento)}</dd>
              <dt style={{ color: "var(--color-ink-soft)" }}>Valor Total</dt>
              <dd className="font-medium"><Money value={iptuData.valor_total} /></dd>
              <dt style={{ color: "var(--color-ink-soft)" }}>Valor Parcela</dt>
              <dd className="font-medium"><Money value={iptuData.valor_parcela} /></dd>
              <dt style={{ color: "var(--color-ink-soft)" }}>Valor Pago</dt>
              <dd className="font-medium"><Money value={iptuData.valor_pago || 0} /></dd>
              <dt style={{ color: "var(--color-ink-soft)" }}>Desconto</dt>
              <dd className="font-medium">{iptuData.desconto > 0 ? <Money value={iptuData.desconto} /> : "—"}</dd>
              <dt style={{ color: "var(--color-ink-soft)" }}>Multa/Juros</dt>
              <dd className="font-medium">{iptuData.multa_juros > 0 ? <Money value={iptuData.multa_juros} /> : "—"}</dd>
              <dt style={{ color: "var(--color-ink-soft)" }}>Status</dt>
              <dd><StatusBadge status={iptuData.status} /></dd>
              <dt style={{ color: "var(--color-ink-soft)" }}>Forma Pagamento</dt>
              <dd>{iptuData.forma_pagamento || "—"}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="font-medium mb-4" style={{ color: "var(--color-ink)" }}>
            Imóvel
          </h3>
          <div className="space-y-2 text-sm">
            <div className="font-medium">{rotuloImovel(imovel)}</div>
            <div style={{ color: "var(--color-ink-soft)" }}>
              {imovel?.tipo} - {imovel?.finalidade}
            </div>
            <div style={{ color: "var(--color-ink-soft)" }}>
              Status: <StatusBadge status={imovel?.status} />
            </div>
            <div style={{ color: "var(--color-ink-soft)" }}>
              Aluguel: <Money value={imovel?.valor_aluguel} />
            </div>
            <div style={{ color: "var(--color-ink-soft)" }}>
              IPTU Mensal: <Money value={imovel?.iptu_mensal || 0} />
            </div>
          </div>
        </Card>
      </div>

      {iptuData.observacoes && (
        <Card>
          <h3 className="font-medium mb-2" style={{ color: "var(--color-ink)" }}>
            Observações
          </h3>
          <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            {iptuData.observacoes}
          </p>
        </Card>
      )}

      {comprovanteUrl && (
        <Card>
          <h3 className="font-medium mb-4" style={{ color: "var(--color-ink)" }}>
            Comprovante
          </h3>
          <a
                  href={comprovanteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-sm font-medium"
            style={{ borderColor: "var(--color-line)", color: "var(--color-teal)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <path d="M21 3v5h-5" />
            </svg>
            Ver comprovante
          </a>
        </Card>
      )}

      <Card>
        <h3 className="font-medium mb-4" style={{ color: "var(--color-ink)" }}>
          Movimentações / Recebimentos
        </h3>
        <Table head={["Data", "Valor", "Forma", "Observações"]}>
          {movimentacoes && movimentacoes.length > 0 ? (
            movimentacoes.map((m: any) => (
              <tr key={m.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                <td className="px-4 py-2.5 whitespace-nowrap">{formatarData(m.data_pagamento)}</td>
                <td className="px-4 py-2.5 whitespace-nowrap"><Money value={m.valor_pago} /></td>
                <td className="px-4 py-2.5">{m.forma_pagamento || "—"}</td>
                <td className="px-4 py-2.5">{m.observacoes || "—"}</td>
              </tr>
            ))
          ) : (
            <LinhaVazia key="vazio" colunas={4} mensagem="Nenhum recebimento registrado." />
          )}
        </Table>
      </Card>
    </div>
  );
}