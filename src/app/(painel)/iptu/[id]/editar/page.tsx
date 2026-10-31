import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { FormIptu } from "../../form-iptu";

export default async function IptuEditarPage({
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

  const { data: imoveis } = await supabase
    .from("imoveis")
    .select("id, codigo, logradouro, numero, complemento, bairro, cidade, uf, cep, tipo, finalidade, status, area_total, area_util, valor_aluguel, valor_condominio, iptu_mensal, matricula, matricula_agua, matricula_luz, observacoes, proprietarios(nome)")
    .order("codigo", { ascending: true });

  return (
    <div className="space-y-6">
      <FormIptu imoveis={imoveis || []} iptu={iptu} />
    </div>
  );
}