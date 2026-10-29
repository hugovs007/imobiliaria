import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Table } from "@/components/ui";
import { obterPerfilAtual } from "@/lib/empresa";
import { alternarEmpresaAtivo } from "./actions";
import { FormCriarAdminEmpresa, FormCriarEmpresa } from "./forms";

export default async function EmpresasPage() {
  const perfil = await obterPerfilAtual();
  if (!perfil || perfil.papel !== "super_admin") {
    notFound();
  }

  const supabase = await createClient();
  const { data: empresas } = await supabase
    .from("empresas")
    .select("*, imoveis(count), contratos(count), inquilinos(count), profiles(count)")
    .order("nome");

  const lista = empresas ?? [];

  return (
    <div>
      <PageHeader
        title="Empresas"
        subtitle="Cada empresa é um locador isolado. Crie a empresa e o administrador que vai gerenciar imóveis, inquilinos e contratos."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FormCriarEmpresa />
        <FormCriarAdminEmpresa empresas={lista.map((e) => ({ id: e.id, nome: e.nome }))} />
      </div>

      <Table head={["Empresa", "Cidade", "Imóveis", "Contratos", "Inquilinos", "Usuários", "Ativo", ""]}>
        {lista.map((empresa) => (
          <tr key={empresa.id} style={{ borderTop: "1px solid var(--color-line)" }}>
            <td className="px-4 py-2.5">
              <span className="font-medium">{empresa.nome}</span>
              <div className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                {empresa.cnpj_cpf || "—"}
              </div>
            </td>
            <td className="px-4 py-2.5">
              {empresa.cidade ? `${empresa.cidade}${empresa.uf ? ` - ${empresa.uf}` : ""}` : "—"}
            </td>
            <td className="px-4 py-2.5">{empresa.imoveis?.[0]?.count ?? 0}</td>
            <td className="px-4 py-2.5">{empresa.contratos?.[0]?.count ?? 0}</td>
            <td className="px-4 py-2.5">{empresa.inquilinos?.[0]?.count ?? 0}</td>
            <td className="px-4 py-2.5">{empresa.profiles?.[0]?.count ?? 0}</td>
            <td className="px-4 py-2.5">{empresa.ativo ? "Sim" : "Não"}</td>
            <td className="px-4 py-2.5">
              <form action={alternarEmpresaAtivo}>
                <input type="hidden" name="id" value={empresa.id} />
                <input type="hidden" name="ativo" value={String(empresa.ativo)} />
                <button className="text-xs underline" style={{ color: "var(--color-ink-soft)" }}>
                  {empresa.ativo ? "Desativar" : "Ativar"}
                </button>
              </form>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
