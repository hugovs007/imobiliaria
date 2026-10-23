import { createClient } from "@/lib/supabase/server";
import { Alert, PageHeader } from "@/components/ui";
import FormConfigBB from "./form-config";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("configuracoes").select("chave, valor");

  const mapa = new Map((data ?? []).map((r: any) => [String(r.chave), String(r.valor ?? "")]));
  const tabelaPronta = !error;

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Integração com o Banco do Brasil para emissão de boletos e baixa automática de mensalidades."
      />

      {!tabelaPronta && (
        <Alert variant="destructive" className="mb-4">
          A tabela <strong>configuracoes</strong> ainda não existe no banco. Execute a migração{" "}
          <code>0018_boletos_bb.sql</code> no SQL Editor do Supabase e recarregue esta página.
        </Alert>
      )}

      <FormConfigBB
        tabelaPronta={tabelaPronta}
        inicial={{
          ambiente: mapa.get("bb_ambiente") === "producao" ? "producao" : "sandbox",
          clientId: mapa.get("bb_client_id") || "",
          temSecret: Boolean((mapa.get("bb_client_secret") || "").trim()),
          convenio: mapa.get("bb_convenio") || "",
          carteira: mapa.get("bb_carteira") || "17",
          variacao: mapa.get("bb_variacao") || "019",
          modalidade: mapa.get("bb_modalidade") || "1",
        }}
      />
    </div>
  );
}
