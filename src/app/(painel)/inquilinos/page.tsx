import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, Table } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { FormCriarInquilino } from "./form-criar-inquilino";

export default async function InquilinosPage() {
  const supabase = await createClient();

  const { data: inquilinos, error: inquilinosError } = await supabase
    .from("inquilinos")
    .select("*")
    .order("nome", { ascending: true });

  if (inquilinosError) {
    console.error("Erro ao carregar inquilinos:", inquilinosError.message);
  }

  const listaInquilinos = inquilinos ?? [];

  return (
    <div>
      <PageHeader
        title="Inquilinos"
        subtitle="Pessoas que ocupam os imóveis administrados."
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              Novo inquilino
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
              Abra o formulário para cadastrar uma pessoa que ocupa um imóvel administrado.
            </p>
          </div>
          <FormCriarInquilino />
        </div>
      </Card>

      <div className="mt-8">
        <Table head={["Nome", "CPF/CNPJ", "Telefone", "E-mail", ""]}>
          {listaInquilinos.length === 0 ? (
            <tr style={{ borderTop: "1px solid var(--color-line)" }}>
              <td colSpan={5} className="px-4 py-4 text-center" style={{ color: "var(--color-ink-soft)" }}>
                Nenhum inquilino cadastrado.
              </td>
            </tr>
          ) : (
            listaInquilinos.map((i) => (
              <tr key={i.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                <td className="px-4 py-2.5 font-medium">{i.nome}</td>
                <td className="px-4 py-2.5">{i.cpf_cnpj || "—"}</td>
                <td className="px-4 py-2.5">{i.telefone || "—"}</td>
                <td className="px-4 py-2.5">{i.email || "—"}</td>
                <td className="px-4 py-2.5">
                  <RecordEditor
                    entity="inquilinos"
                    id={i.id}
                    fields={[
                      { name: "nome", label: "Nome", value: i.nome, required: true },
                      { name: "cpf_cnpj", label: "CPF/CNPJ", value: i.cpf_cnpj },
                      { name: "telefone", label: "Telefone", value: i.telefone },
                      { name: "email", label: "E-mail", value: i.email, type: "email" },
                      { name: "observacoes", label: "Observações", value: i.observacoes, kind: "textarea" },
                    ]}
                  />
                </td>
              </tr>
            ))
          )}
        </Table>
      </div>
    </div>
  );
}