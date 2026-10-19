import { notFound, redirect } from "next/navigation";
import { getSessaoPortal } from "@/lib/portal-auth";
import { numeroParaExtenso } from "@/lib/valor-extenso";
import { PrintButton } from "@/app/(painel)/recibos/[id]/print-button";

export const metadata = {
  title: "Recibo | Portal do Inquilino",
};

function formatarEnderecoImovel(imovel: any): string {
  if (!imovel) return "Endereço não informado";
  const rua = imovel.logradouro || imovel.endereco;
  const cidadeUf = [imovel.cidade, imovel.uf || imovel.estado].filter(Boolean).join("/");

  const partes = [
    [rua, imovel.numero].filter(Boolean).join(", "),
    imovel.bairro,
    cidadeUf,
  ].filter(Boolean);

  return partes.length > 0 ? partes.join(", ") : "Endereço não informado";
}

function formatarDataBR(dataRaw: string | null | undefined): string {
  if (!dataRaw) return "—";
  try {
    const dataObj = new Date(dataRaw + (dataRaw.includes("T") ? "" : "T00:00:00"));
    if (isNaN(dataObj.getTime())) return "—";
    return dataObj.toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function formatarMesAnoExtenso(dataRaw: string | null | undefined): string {
  if (!dataRaw) return "—";
  try {
    const dataObj = new Date(dataRaw + (dataRaw.includes("T") ? "" : "T00:00:00"));
    if (isNaN(dataObj.getTime())) return "—";

    const meses = [
      "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
      "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
    ];

    return `${meses[dataObj.getMonth()]} DE ${dataObj.getFullYear()}`;
  } catch {
    return "—";
  }
}

function calcularIdentificacaoParcela(contrato: any, competencia: string): string {
  if (!contrato?.data_inicio || !competencia) return "01/12";
  try {
    const dataInicio = new Date(contrato.data_inicio + "T00:00:00");
    const dataCompetencia = new Date(competencia + "T00:00:00");

    if (isNaN(dataInicio.getTime()) || isNaN(dataCompetencia.getTime())) {
      return "01/12";
    }

    const diffAnos = dataCompetencia.getFullYear() - dataInicio.getFullYear();
    const diffMeses = dataCompetencia.getMonth() - dataInicio.getMonth();
    const parcelaAtual = diffAnos * 12 + diffMeses + 1;

    const mesesContrato = Number(contrato.periodicidade_reajuste_meses || 12);
    const parcelaExibida = Math.max(1, parcelaAtual <= mesesContrato ? parcelaAtual : ((parcelaAtual - 1) % mesesContrato) + 1);

    return `${String(parcelaExibida).padStart(2, "0")}/${String(mesesContrato).padStart(2, "0")}`;
  } catch {
    return "01/12";
  }
}

function calcularPeriodoVigente(competenciaRaw: string | null | undefined, contrato: any): { inicio: string; fim: string } {
  try {
    if (!competenciaRaw) return { inicio: "—", fim: "—" };

    const [ano, mes] = competenciaRaw.slice(0, 7).split("-").map(Number);
    if (!ano || !mes) return { inicio: "—", fim: "—" };

    let diaInicioContrato = 1;
    if (contrato?.data_inicio) {
      const dia = parseInt(String(contrato.data_inicio).slice(8, 10), 10);
      if (!isNaN(dia) && dia >= 1) diaInicioContrato = dia;
    }

    const ultimoDiaMesCompetencia = new Date(ano, mes, 0).getDate();
    const diaEfetivo = Math.min(diaInicioContrato, ultimoDiaMesCompetencia);

    const dataInicio = new Date(ano, mes - 1, diaEfetivo);
    const dataFim = new Date(ano, mes, diaEfetivo);
    dataFim.setDate(dataFim.getDate() - 1);

    return {
      inicio: dataInicio.toLocaleDateString("pt-BR"),
      fim: dataFim.toLocaleDateString("pt-BR"),
    };
  } catch {
    return { inicio: "—", fim: "—" };
  }
}

export default async function PortalReciboPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const id = params?.id;
  if (!id) notFound();

  const contratoId = await getSessaoPortal();
  if (!contratoId) redirect("/portal");

  const { createPortalClient } = await import("@/lib/portal-auth");
  const supabase = await createPortalClient();

  const { data: pagamento } = await supabase
    .from("pagamentos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!pagamento) notFound();

  // Segurança: o recibo só pode ser do contrato da sessão do inquilino.
  if (pagamento.contrato_id !== contratoId) notFound();

  const { data: contrato } = await supabase
    .from("contratos")
    .select("id, codigo, data_inicio, periodicidade_reajuste_meses, imoveis(logradouro, numero, bairro, cidade, uf, tipo), inquilinos(nome, cpf_cnpj)")
    .eq("id", contratoId)
    .maybeSingle();

  if (!contrato) notFound();

  const imovel = Array.isArray(contrato.imoveis) ? contrato.imoveis[0] : contrato.imoveis;
  const inquilino = Array.isArray(contrato.inquilinos) ? contrato.inquilinos[0] : contrato.inquilinos;

  const valorBase = Number(pagamento.valor_base || 0);
  const valorPago = Number(pagamento.valor_pago || valorBase);
  const parcelaFormatada = calcularIdentificacaoParcela(contrato, pagamento.competencia);
  const periodoVigencia = calcularPeriodoVigente(pagamento.competencia, contrato);

  const obsPag = pagamento.observacoes || "";
  const multaMatch = obsPag.match(/Multa por atraso \(\d+%\): R\$ ([\d.,]+)/);
  const multa = multaMatch ? parseFloat(multaMatch[1].replace(",", ".")) : 0;

  return (
    <div className="min-h-screen bg-gray-100 p-6 print:m-0 print:bg-white print:min-h-0 print:px-0 print:py-4 flex flex-col items-center">
      <div className="mb-6 print:hidden flex gap-3">
        <PrintButton />
      </div>

      <div className="bg-white border-2 border-gray-800 rounded-lg p-8 w-full max-w-2xl shadow-lg print:shadow-none print:border-black print:w-full print:m-0 print:p-6 print:rounded-none">
        {/* Cabeçalho */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6 print:pb-2 print:mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wide text-gray-900">RECIBO {parcelaFormatada}</h1>
            <p className="text-xs text-gray-600">Comprovante Oficial de Aluguel e Quitação</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 block">Contrato Nº</span>
            <span className="text-sm font-mono font-bold">{contrato.codigo || "—"}</span>
          </div>
        </div>

        {/* Dados do inquilino e imóvel */}
        <div className="mb-6 print:mb-4 text-sm">
          <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
            <tbody>
              <tr>
                <td className="w-1/2 px-2 py-1 text-left">
                  <span className="text-xs text-gray-500 block">Inquilino (Pagador)</span>
                  <strong className="text-gray-900 block">{inquilino?.nome || "Inquilino não informado"}</strong>
                  <span className="text-xs text-gray-600">CPF/CNPJ: {inquilino?.cpf_cnpj || "—"}</span>
                </td>
                <td className="w-1/2 px-2 py-1 text-left">
                  <span className="text-xs text-gray-500 block">Imóvel</span>
                  <span className="text-gray-900 font-medium block">{formatarEnderecoImovel(imovel)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Declaração */}
        <div className="bg-gray-50 border border-gray-300 rounded p-5 print:p-4 mb-6 print:mb-4 text-justify text-base leading-relaxed font-sans print:bg-white print:border-black">
          Recebi da Sr(a). <strong className="uppercase">{inquilino?.nome || "—"}</strong> a quantia de{" "}
          <strong>
            R$ {valorPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({numeroParaExtenso(valorPago)})
          </strong>
          , referente ao aluguel do mês de{" "}
          <strong className="uppercase">{formatarMesAnoExtenso(pagamento.competencia)}</strong>, de um imóvel{" "}
          {imovel?.tipo || "residencial"} localizado na {formatarEnderecoImovel(imovel)}.
        </div>

        {/* Resumo financeiro */}
        <div className="border-2 border-emerald-600 bg-emerald-50 rounded p-4 mb-6 print:mb-4 text-center print:bg-white print:border-black">
          <table className="w-full border-collapse mb-2" style={{ tableLayout: "fixed" }}>
            <tbody>
              <tr>
                <td className="px-2 py-1 text-left text-xs text-gray-700">
                  Data do Pagamento: <strong>{formatarDataBR(pagamento.data_pagamento)}</strong>
                </td>
                <td className="px-2 py-1 text-right text-xs text-gray-700">
                  Valor Total Aluguel: <strong>R$ {valorBase.toFixed(2)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="border-t border-emerald-200 pt-2">
            <span className="text-xs font-semibold uppercase text-emerald-800 tracking-wider block">Valor Recebido</span>
            <span className="text-2xl font-extrabold text-emerald-900 block my-1">R$ {valorPago.toFixed(2)}</span>
            {multa > 0 && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                <span className="text-xs font-semibold text-amber-800 block">Multa por atraso: R$ {multa.toFixed(2)}</span>
                <span className="text-xs text-amber-700">Valor do aluguel: R$ {(valorPago - multa).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {obsPag && obsPag !== "—" && (
          <div className="mb-6 print:mb-4 text-xs text-gray-600 border-l-2 border-gray-400 pl-3 italic">
            Obs: {obsPag}
          </div>
        )}

        <div className="text-center text-sm font-semibold my-6 print:my-4 font-sans text-gray-800">
          Para clareza, firmo o presente dando plena e total quitação.
        </div>

        {/* Assinatura */}
        <div className="mt-12 print:mt-6 pt-6 print:pt-3 flex flex-col items-center text-center font-sans">
          <div className="text-base mb-16 print:mb-20 font-semibold text-gray-800">
            {formatarDataBR(pagamento.data_pagamento)}
          </div>
          <div className="w-[28rem] border-t-2 border-gray-900 pt-3">
            <span className="font-extrabold text-lg text-gray-900 block tracking-wide">Paulo Sérgio de Souza Tôrres</span>
            <span className="text-xs font-bold text-gray-600 tracking-widest uppercase mt-0.5 block">RECEBEDOR</span>
          </div>
        </div>

        {/* Rodapé */}
        <div className="mt-12 print:mt-6 pt-3 border-t border-gray-200 text-[11px] font-mono text-gray-500">
          <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
            <tbody>
              <tr>
                <td className="px-2 py-1 text-left">Período Vigente do Mês:</td>
                <td className="px-2 py-1 text-right">
                  De: {periodoVigencia.inicio} &nbsp;&nbsp;a&nbsp;&nbsp; {periodoVigencia.fim}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
