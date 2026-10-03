import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PrintButton } from "@/app/(painel)/recibos/[id]/print-button";

function formatarDataPorExtenso(dataRaw: string | null | undefined): string {
  if (!dataRaw) return "data de assinatura";
  try {
    const dataObj = new Date(dataRaw + (dataRaw.includes("T") ? "" : "T00:00:00"));
    if (isNaN(dataObj.getTime())) return "data de assinatura";
    
    const meses = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    
    const dia = String(dataObj.getDate()).padStart(2, "0");
    const mes = meses[dataObj.getMonth()];
    const ano = dataObj.getFullYear();
    
    return `${dia} de ${mes} de ${ano}`;
  } catch {
    return "data de assinatura";
  }
}

function numeroParaExtenso(valor: number): string {
  if (isNaN(valor) || valor <= 0) return "ZERO REAIS";
  
  const unidades = ["", "UM", "DOIS", "TRÊS", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE", "DEZ", "ONZE", "DOZE", "TREZE", "CATORZE", "QUINZE", "DEZESSEIS", "DEZESSETE", "DEZOITO", "DEZENOVE"];
  const dezenas = ["", "", "VINTE", "TRINTA", "QUARENTA", "CINQUENTA", "SESSENTA", "SETENTA", "OITENTA", "NOVENTA"];
  const centenas = ["", "CENTO", "DUZENTOS", "TREZENTOS", "QUATROCENTOS", "QUINHENTOS", "SEISCENTOS", "SETECENTOS", "OITOCENTOS", "NOVECENTOS"];

  function converterInteiro(num: number): string {
    if (num === 0) return "";
    if (num === 100) return "CEM";
    if (num < 20) return unidades[num];
    if (num < 100) {
      const d = Math.floor(num / 10);
      const u = num % 10;
      return dezenas[d] + (u > 0 ? " E " + unidades[u] : "");
    }
    const c = Math.floor(num / 100);
    const resto = num % 100;
    return centenas[c] + (resto > 0 ? " E " + converterInteiro(resto) : "");
  }

  const parteInteira = Math.floor(valor);
  const centavos = Math.round((valor - parteInteira) * 100);

  let resultado = "";
  if (parteInteira === 1) {
    resultado = "UM REAL";
  } else if (parteInteira > 0) {
    resultado = converterInteiro(parteInteira) + " REAIS";
  }

  if (centavos > 0) {
    resultado += (resultado ? " E " : "") + converterInteiro(centavos) + (centavos === 1 ? " CENTAVO" : " CENTAVOS");
  }

  return resultado;
}

export default async function ImprimirContratoPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const contratoId = params?.id;

  if (!contratoId) notFound();

  const supabase = await createClient();

  const { data: contrato, error } = await supabase
    .from("contratos")
    .select("*, imoveis(*), inquilinos(*)")
    .eq("id", contratoId)
    .maybeSingle();

  if (error || !contrato) {
    notFound();
  }

  const imovel = contrato.imoveis || {};
  const inquilino = contrato.inquilinos || {};
  const valorAluguel = Number(contrato.valor_aluguel || contrato.valor_atual || 0);

  const enderecoImovel = [
    [imovel.logradouro || imovel.endereco, imovel.numero].filter(Boolean).join(", "),
    imovel.complemento,
    imovel.bairro,
    `${imovel.cidade || "Santa Luzia"} – ${imovel.uf || imovel.estado || "PB"}`,
    imovel.cep ? `CEP ${imovel.cep}` : null,
  ].filter(Boolean).join(", ");

  const dataInicioExtenso = formatarDataPorExtenso(contrato.data_inicio);
  const dataFimExtenso = formatarDataPorExtenso(contrato.data_fim);
  const dataAssinaturaExtenso = formatarDataPorExtenso(contrato.data_inicio || new Date().toISOString().split("T")[0]);

  return (
    <div className="min-h-screen bg-gray-100 p-6 print:p-0 print:bg-white flex flex-col items-center">
      <div className="mb-6 print:hidden">
        <PrintButton />
      </div>

      <div className="bg-white border border-gray-400 p-12 w-full max-w-4xl shadow-lg print:shadow-none print:border-none font-serif text-black text-justify leading-relaxed text-sm">
        
        <h1 className="text-center font-bold text-base mb-8 uppercase">CONTRATO DE LOCAÇÃO RESIDENCIAL</h1>

        <div className="mb-6 space-y-2">
          <p>
            <strong>LOCADOR:</strong> Paulo Sérgio de Souza Torres, brasileiro, casado, empresário, portador do CPF nº 930.952.604-15, residente na Rua José Bonifácio Nóbrega, nº 817, apartamento 103, Bairro São José, Santa Luzia – PB.
          </p>
          <p>
            <strong>LOCATÁRIA:</strong> <span className="uppercase">{inquilino.nome || "—"}</span>, {inquilino.nacionalidade || "brasileira"}, {inquilino.estado_civil || "solteira(o)"}, portadora(o) do CPF nº {inquilino.cpf || "—"}. Contato: {inquilino.telefone || "—"}.
          </p>
          <div>
            <strong>FIADORES:</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1 pl-2">
              <li>
                {contrato.fiador_1_nome || "—"}, {contrato.fiador_1_estado_civil || "—"}, {contrato.fiador_1_profissao || "—"}, residente na {contrato.fiador_1_endereco || "—"}, CPF nº {contrato.fiador_1_cpf || "—"}. Contato: {contrato.fiador_1_telefone || "—"}
              </li>
              {contrato.fiador_2_nome && (
                <li>
                  {contrato.fiador_2_nome}, {contrato.fiador_2_estado_civil || "—"}, {contrato.fiador_2_profissao || "—"}, residente na {contrato.fiador_2_endereco || "—"}, CPF nº {contrato.fiador_2_cpf || "—"}. Contato: {contrato.fiador_2_telefone || "—"}
                </li>
              )}
            </ol>
          </div>
        </div>

        <p className="mb-4">
          As partes acima identificadas celebram o presente <strong>CONTRATO DE LOCAÇÃO RESIDENCIAL</strong>, que se regerá pelas cláusulas e condições seguintes.
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="font-bold uppercase">CLÁUSULA 1ª – DO IMÓVEL</h3>
            <p>O imóvel objeto deste contrato está localizado na {enderecoImovel}.</p>
            <p className="mt-1">O imóvel é entregue na data da assinatura do contrato pelo locador ao locatário, que se obriga a devolvê-lo com todos os utensílios e acessórios em perfeitas condições de funcionamento, limpo e conservado.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase">CLÁUSULA 2ª – DO PRAZO</h3>
            <p>O prazo da locação é de {contrato.periodicidade_reajuste_meses || 12} (DOZE) meses, com início em <strong>{dataInicioExtenso}</strong> e término em <strong>{dataFimExtenso}</strong>.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase">CLÁUSULA 3ª – DO VALOR E FORMA DE PAGAMENTO</h3>
            <p>O aluguel mensal é de <strong>R$ {valorAluguel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({numeroParaExtenso(valorAluguel)})</strong>, devendo ser pago via PIX para o Sr. Paulo Sérgio de Souza Torres, chave PIX formato CPF 930.952.604-15, Banco do Brasil.</p>
            <p className="mt-1">O pagamento deve ser efetuado até o dia {contrato.dia_vencimento || 10} de cada mês. O valor do aluguel será reajustado anualmente conforme a variação do {contrato.indice_reajuste || "IPCA"}.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase">CLÁUSULA 4ª – DAS DESPESAS E OBRIGAÇÕES DO LOCATÁRIO</h3>
            <p>Todas as despesas diretamente ligadas à conservação e uso do imóvel, como água, energia elétrica, IPTU e taxas, serão de responsabilidade exclusiva do locatário. O atraso acarretará multa de 10% sobre o valor devido e juros de 1% ao mês.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase">CLÁUSULA 5ª – DO USO DO IMÓVEL</h3>
            <p>O imóvel destina-se exclusivamente para fins residenciais, sendo vedada a sublocação sem autorização expressa.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase">CLÁUSULA 6ª – DAS BENFEITORIAS</h3>
            <p>Qualquer benfeitoria deverá ser previamente autorizada pelo locador, integrando o imóvel sem direito a indenização.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase">CLÁUSULA 7ª – DA DEVOLUÇÃO DO IMÓVEL</h3>
            <p>Ao término da locação, o imóvel deverá ser devolvido nas mesmas condições em que foi recebido, limpo e pintado.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase">CLÁUSULA 8ª – DA PRORROGAÇÃO</h3>
            <p>Caso o locatário permaneça no imóvel após o término, o contrato será prorrogado por prazo indeterminado.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase">CLÁUSULA 9ª – DO DIREITO DE PREFERÊNCIA E VISTORIAS</h3>
            <p>O locador poderá realizar vistorias periódicas mediante aviso prévio.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase">CLÁUSULA 10ª – DAS PENALIDADES E MULTAS</h3>
            <p>O descumprimento de cláusula contratual sujeitará a parte infratora ao pagamento de multa equivalente a 3 (três) meses de aluguel.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase">CLÁUSULA 11ª – DOS FIADORES</h3>
            <p>Os fiadores acima qualificados obrigam-se como principais pagadores, renunciando aos benefícios dos artigos 827 e 835 do Código Civil.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase">CLÁUSULA 12ª – DO FORO</h3>
            <p>Fica eleito o foro da cidade de Santa Luzia – PB para dirimir quaisquer controvérsias oriundas deste contrato.</p>
          </div>
        </div>

        <p className="mt-8 text-center font-semibold">
          Santa Luzia – PB, {dataAssinaturaExtenso}.
        </p>

        <div className="mt-12 space-y-8 text-xs">
          <div className="border-t border-black pt-1 w-full text-center">LOCADOR: PAULO SERGIO DE SOUZA TORRES</div>
          <div className="border-t border-black pt-1 w-full text-center uppercase">LOCATÁRIA: {inquilino.nome || "—"}</div>
          <div className="border-t border-black pt-1 w-full text-center uppercase">FIADOR 1: {contrato.fiador_1_nome || "—"}</div>
          {contrato.fiador_2_nome && (
            <div className="border-t border-black pt-1 w-full text-center uppercase">FIADOR 2: {contrato.fiador_2_nome}</div>
          )}
        </div>

      </div>
    </div>
  );
}