import { Card, PageHeader } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { obterPerfilAtual } from "@/lib/empresa";
import { createClient } from "@/lib/supabase/server";

export default async function MinhaEmpresaPage() {
  const perfil = await obterPerfilAtual();

  if (!perfil) {
    return (
      <div>
        <PageHeader title="Minha Empresa" subtitle="Perfil não encontrado." />
      </div>
    );
  }

  if (!perfil.empresa_id) {
    return (
      <div>
        <PageHeader
          title="Minha Empresa"
          subtitle="Super administrador não possui empresa vinculada."
        />
        <Card>
          <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Como super administrador você gerencia todas as empresas em{" "}
            <span className="font-medium">Sistema → Empresas</span>.
          </p>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: empresa } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", perfil.empresa_id)
    .maybeSingle();

  if (!empresa) {
    return (
      <div>
        <PageHeader title="Minha Empresa" subtitle="Empresa não encontrada." />
      </div>
    );
  }

  const campos = [
    { name: "nome", label: "Nome / Razão social", value: empresa.nome },
    { name: "cnpj_cpf", label: "CNPJ / CPF", value: empresa.cnpj_cpf },
    { name: "nacionalidade", label: "Nacionalidade", value: empresa.nacionalidade },
    { name: "estado_civil", label: "Estado civil", value: empresa.estado_civil },
    { name: "profissao", label: "Profissão", value: empresa.profissao },
    { name: "endereco", label: "Endereço (rua)", value: empresa.endereco },
    { name: "numero", label: "Número", value: empresa.numero },
    { name: "complemento", label: "Complemento", value: empresa.complemento },
    { name: "bairro", label: "Bairro", value: empresa.bairro },
    { name: "cidade", label: "Cidade", value: empresa.cidade },
    { name: "uf", label: "UF", value: empresa.uf },
    { name: "cep", label: "CEP", value: empresa.cep },
    { name: "telefone", label: "Telefone", value: empresa.telefone },
    { name: "email", label: "E-mail", value: empresa.email },
    { name: "whatsapp", label: "WhatsApp (com DDD)", value: empresa.whatsapp },
    { name: "chave_pix", label: "Chave PIX (ex.: CPF ..., Banco ...)", value: empresa.chave_pix },
    { name: "logo_url", label: "URL do logo", value: empresa.logo_url },
  ];

  return (
    <div>
      <PageHeader
        title="Minha Empresa"
        subtitle="Dados do locador usados em contratos, recibos e comunicações."
      />

      <div className="space-y-4">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
                {empresa.nome}
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                {empresa.cnpj_cpf}
                {empresa.cidade ? ` — ${empresa.cidade}${empresa.uf ? ` - ${empresa.uf}` : ""}` : ""}
              </p>
            </div>
            <RecordEditor entity="empresas" id={empresa.id} fields={campos} />
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Nacionalidade", empresa.nacionalidade],
              ["Estado civil", empresa.estado_civil],
              ["Profissão", empresa.profissao],
              [
                "Endereço",
                [empresa.endereco, empresa.numero, empresa.complemento, empresa.bairro]
                  .filter(Boolean)
                  .join(", "),
              ],
              ["CEP", empresa.cep],
              ["Telefone", empresa.telefone],
              ["WhatsApp", empresa.whatsapp],
              ["E-mail", empresa.email],
              ["Chave PIX", empresa.chave_pix],
            ].map(([label, valor]) => (
              <div key={label as string}>
                <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-soft)" }}>
                  {label}
                </dt>
                <dd className="mt-1 text-sm" style={{ color: "var(--color-ink)" }}>
                  {valor ? (
                    String(valor)
                  ) : (
                    <span style={{ color: "var(--color-ink-soft)" }}>—</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Estes dados substituem o locador nos contratos impressos e nos recibos. Mantenha o
            WhatsApp e a chave PIX atualizados — eles aparecem nas cláusulas de pagamento.
          </p>
        </Card>
      </div>
    </div>
  );
}
