import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, PageHeader, Select, StatusBadge } from "@/components/ui";
import {
  adicionarFotoVistoria,
  adicionarItemVistoria,
  atualizarItemVistoria,
  excluirFotoVistoria,
  excluirItemVistoria,
} from "../actions";

const TIPOS_VISTORIA: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
  periodica: "Periódica",
};

const ESTADOS_ITEM = [
  { value: "bom", label: "Bom" },
  { value: "regular", label: "Regular" },
  { value: "ruim", label: "Ruim" },
  { value: "nao_se_aplica", label: "Não se aplica" },
];

interface ItemVistoria {
  id: string;
  comodo: string;
  item: string;
  estado: string | null;
  observacao: string | null;
}

function formatarDataBR(valor: string | null): string {
  if (!valor) return "—";
  const data = valor.includes("T") ? valor : `${valor}T00:00:00`;
  return new Date(data).toLocaleDateString("pt-BR");
}

export default async function DetalheVistoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [vistoriaRes, itensRes, fotosRes] = await Promise.all([
    supabase
      .from("vistorias")
      .select(
        "id, tipo, data_vistoria, vistoriador, observacoes_gerais, imoveis(logradouro, numero, bairro, cidade), contratos(codigo, inquilinos(nome))"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("vistoria_itens")
      .select("id, comodo, item, estado, observacao")
      .eq("vistoria_id", id)
      .order("comodo", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("vistoria_fotos")
      .select("id, url, descricao")
      .eq("vistoria_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const vistoria = vistoriaRes.data;
  if (!vistoria) notFound();

  const itens: ItemVistoria[] = itensRes.data ?? [];
  const fotos = fotosRes.data ?? [];

  // Agrupa os itens por cômodo (a consulta já vem ordenada por cômodo).
  const gruposMap = new Map<string, ItemVistoria[]>();
  for (const item of itens) {
    const lista = gruposMap.get(item.comodo);
    if (lista) {
      lista.push(item);
    } else {
      gruposMap.set(item.comodo, [item]);
    }
  }
  const grupos = Array.from(gruposMap.entries()).map(([comodo, itensDoGrupo]) => ({
    comodo,
    itens: itensDoGrupo,
  }));

  const imovel = Array.isArray(vistoria.imoveis)
    ? vistoria.imoveis[0]
    : (vistoria.imoveis as unknown as {
        logradouro: string | null;
        numero: string | null;
        bairro: string | null;
        cidade: string | null;
      } | null);
  const contrato = Array.isArray(vistoria.contratos)
    ? vistoria.contratos[0]
    : (vistoria.contratos as unknown as { codigo: string | null; inquilinos: unknown } | null);
  const inquilino = contrato
    ? Array.isArray(contrato.inquilinos)
      ? (contrato.inquilinos[0] as { nome: string } | undefined)?.nome
      : (contrato.inquilinos as unknown as { nome: string } | null)?.nome
    : null;
  const endereco = imovel
    ? [imovel.logradouro, imovel.numero, imovel.bairro, imovel.cidade]
        .filter(Boolean)
        .join(", ")
    : "—";

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/vistorias"
          className="text-sm font-medium"
          style={{ color: "var(--color-teal)" }}
        >
          ← Voltar para vistorias
        </Link>
      </div>

      <PageHeader
        title={`Vistoria de ${TIPOS_VISTORIA[vistoria.tipo] ?? vistoria.tipo}`}
        subtitle={`${endereco}${
          contrato?.codigo ? ` — Contrato ${contrato.codigo}${inquilino ? ` (${inquilino})` : ""}` : ""
        }`}
      />

      <Card className="mb-6">
        <div className="grid gap-4 text-sm sm:grid-cols-4">
          <div>
            <p style={{ color: "var(--color-ink-soft)" }}>Data</p>
            <p className="font-medium">{formatarDataBR(vistoria.data_vistoria)}</p>
          </div>
          <div>
            <p style={{ color: "var(--color-ink-soft)" }}>Tipo</p>
            <p className="font-medium">
              <StatusBadge status={vistoria.tipo} />
            </p>
          </div>
          <div>
            <p style={{ color: "var(--color-ink-soft)" }}>Vistoriador</p>
            <p className="font-medium">{vistoria.vistoriador || "—"}</p>
          </div>
          <div>
            <p style={{ color: "var(--color-ink-soft)" }}>Itens no checklist</p>
            <p className="font-medium">{itens.length}</p>
          </div>
          {vistoria.observacoes_gerais && (
            <div className="sm:col-span-4">
              <p style={{ color: "var(--color-ink-soft)" }}>Observações gerais</p>
              <p className="whitespace-pre-line">{vistoria.observacoes_gerais}</p>
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-6">
        {grupos.map((grupo) => (
          <Card key={grupo.comodo}>
            <h2 className="mb-4 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              {grupo.comodo}
            </h2>
            <div className="space-y-2">
              {grupo.itens.map((item) => (
                <form
                  key={item.id}
                  action={atualizarItemVistoria}
                  className="flex flex-wrap items-end gap-3 rounded-md border p-3"
                  style={{ borderColor: "var(--color-line)" }}
                >
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="vistoria_id" value={vistoria.id} />
                  <div
                    className="min-w-[10rem] flex-1 text-sm font-medium"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {item.item}
                  </div>
                  <Select
                    label="Estado"
                    name="estado"
                    options={ESTADOS_ITEM}
                    defaultValue={item.estado ?? "bom"}
                  />
                  <Field
                    label="Observação"
                    name="observacao"
                    defaultValue={item.observacao ?? ""}
                    className="min-w-[12rem] flex-1"
                  />
                  <Button size="sm">Salvar</Button>
                  <button
                    type="submit"
                    formAction={excluirItemVistoria}
                    className="rounded-sm border px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                    style={{ borderColor: "var(--color-line)", color: "var(--color-alert)" }}
                  >
                    Excluir
                  </button>
                </form>
              ))}
            </div>
            <form
              action={adicionarItemVistoria}
              className="mt-3 flex flex-wrap items-end gap-3 rounded-md border border-dashed p-3"
              style={{ borderColor: "var(--color-line)" }}
            >
              <input type="hidden" name="vistoria_id" value={vistoria.id} />
              <input type="hidden" name="comodo" value={grupo.comodo} />
              <Field
                label="Novo item"
                name="item"
                required
                placeholder="Ex.: Piso, janela, torneira..."
                className="min-w-[12rem] flex-1"
              />
              <Select label="Estado" name="estado" options={ESTADOS_ITEM} defaultValue="bom" />
              <Field label="Observação" name="observacao" className="min-w-[10rem] flex-1" />
              <Button size="sm" variant="ghost">
                Adicionar item
              </Button>
            </form>
          </Card>
        ))}

        <details
          className="rounded-md border p-4"
          style={{ borderColor: "var(--color-line)" }}
        >
          <summary
            className="cursor-pointer text-sm font-medium"
            style={{ color: "var(--color-ink)" }}
          >
            Adicionar item em novo cômodo
          </summary>
          <form action={adicionarItemVistoria} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="vistoria_id" value={vistoria.id} />
            <Field label="Cômodo" name="comodo" required placeholder="Ex.: Varanda, lavanderia..." />
            <Field label="Item" name="item" required placeholder="Ex.: Piso, tanque..." />
            <Select label="Estado" name="estado" options={ESTADOS_ITEM} defaultValue="bom" />
            <Field label="Observação" name="observacao" />
            <div className="sm:col-span-2">
              <Button size="sm" variant="ghost">
                Adicionar
              </Button>
            </div>
          </form>
        </details>
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
          Fotos
        </h2>
        <form action={adicionarFotoVistoria} className="mb-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="vistoria_id" value={vistoria.id} />
          <Field
            label="URL da foto"
            name="url"
            required
            placeholder="https://..."
            className="sm:col-span-2"
          />
          <Field label="Descrição" name="descricao" placeholder="Ex.: Rachadura na parede da sala" />
          <div className="flex items-end">
            <Button size="sm" variant="ghost">
              Adicionar foto
            </Button>
          </div>
        </form>
        {fotos.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Nenhuma foto registrada. Cole a URL de uma foto (ex.: link do Google Drive) para
            anexá-la à vistoria.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fotos.map((foto) => (
              <li
                key={foto.id}
                className="rounded-md border p-3"
                style={{ borderColor: "var(--color-line)" }}
              >
                <a href={foto.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto.url}
                    alt={foto.descricao ?? "Foto da vistoria"}
                    className="h-40 w-full rounded object-cover"
                  />
                </a>
                <div className="mt-2 flex items-start justify-between gap-2">
                  <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                    {foto.descricao || "Sem descrição"}
                  </p>
                  <form action={excluirFotoVistoria}>
                    <input type="hidden" name="id" value={foto.id} />
                    <input type="hidden" name="vistoria_id" value={vistoria.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium"
                      style={{ color: "var(--color-alert)" }}
                    >
                      Excluir
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
