import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function PrintContractButton() {
  return (
    <button
      type="button"
      onClick={() => typeof window !== "undefined" && window.print()}
      className="flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:opacity-95 cursor-pointer"
      style={{ backgroundColor: "#0f766e" }}
    >
      🖨️ Imprimir Contrato
    </button>
  );
}

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
  const resolvedParams = await props.params;
  const contratoId = resolvedParams?.id;

  if (!contratoId || contratoId === "novo") {
    notFound();
  }

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
    <>
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: A4;
          }
          body {
            background-color: white !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            padding: 20mm !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
        
        {/* Botão de impressão (Oculto na impressão real) */}
        <div className="mb-6 no-print">
          <PrintContractButton />
        </div>

        {/* Documento do Contrato */}
        <div className="print-container bg-white border border-gray-400 p-12 w-full max-w-4xl shadow-lg font-serif text-black text-justify leading-relaxed text-sm">
          
          <h1 className="text-center font-bold text-base mb-8 uppercase tracking-wide">CONTRATO DE LOCAÇÃO RESIDENCIAL</h1>

          <div className="mb-6 space-y-2">
            <p>
              <strong>LOCADOR:</strong> Paulo Sérgio de Souza Torres, brasileiro, casado, empresário, portador do CPF nº 930.952.604-15, residente na Rua José Bonifácio Nóbrega, nº 817, apartamento 103, Bairro São José, Santa Luzia – PB.
            </p>
            <p>
              <strong>LOCATÁRIA:</strong> <span className="uppercase">{inquilino.nome || "—"}</span>, {inquilino.nacionalidade || "brasileira"}, {inquilino.estado_civil || "solteira"}, portadora do CPF nº {inquilino.cpf || "—"}. Contato: {inquilino.telefone || "—"}.
            </p>
            <div>
              <strong>FIADORES:</strong>
              {contrato.fiador_1_nome ? (
                <ol className="list-decimal list-inside mt-1 space-y-1 pl-2">
                  <li>
                    {contrato.fiador_1_nome}, {contrato.fiador_1_estado_civil || "—"}, {contrato.fiador_1_profissao || "—"}, residente na {contrato.fiador_1_endereco || "—"}, portador do CPF nº {contrato.fiador_1_cpf || "—"}. Contato: {contrato.fiador_1_telefone || "—"}
                  </li>
                  {contrato.fiador_2_nome && (
                    <li className="mt-1">
                      {contrato.fiador_2_nome}, {contrato.fiador_2_estado_civil || "—"}, {contrato.fiador_2_profissao || "—"}, residente na {contrato.fiador_2_endereco || "—"}, portador do CPF nº {contrato.fiador_2_cpf || "—"}. Contato: {contrato.fiador_2_telefone || "—"}
                    </li>
                  )}
                </ol>
              ) : (
                <p className="italic text-gray-600 mt-1">Nenhum fiador cadastrado neste contrato.</p>
              )}
            </div>
          </div>

          <p className="mb-4">
            As partes acima identificadas celebram o presente <strong>CONTRATO DE LOCAÇÃO RESIDENCIAL</strong>, que se regerá pelas cláusulas e condições seguintes.
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="font-bold uppercase">CLÁUSULA 1ª – DO IMÓVEL</h3>
              <p>O imóvel objeto deste contrato está localizado na {enderecoImovel}.</p>
              <p className="mt-1">O imóvel é entregue na data da assinatura do contrato pelo locador ao locatário, que se obriga a devolvê-lo com todos os utensílios e acessórios, tais como ar-condicionado com manutenção em dia, ventilador de teto com lâmpadas, portas, portões, janelas e fechaduras em perfeitas condições de funcionamento, limpo e conservado, ainda que o contrato seja rescindido antecipadamente.</p>
            </div>

            <div>
              <h3 className="font-bold uppercase">CLÁUSULA 2ª – DO PRAZO</h3>
              <p>O prazo da locação é de {contrato.periodicidade_reajuste_meses || 12} (DOZE) meses, com início em <strong>{dataInicioExtenso}</strong> e término em <strong>{dataFimExtenso}</strong>.</p>
            </div>

            <div>
              <h3 className="font-bold uppercase">CLÁUSULA 3ª – DO VALOR E FORMA DE PAGAMENTO</h3>
              <p>O aluguel mensal é de <strong>R$ {valorAluguel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({numeroParaExtenso(valorAluguel)})</strong>, devendo ser pago via PIX para o Sr. Paulo Sérgio de Souza Torres, de chave PIX formato CPF 930.952.604-15, Banco do Brasil.</p>
              <p className="mt-1">O comprovante de pagamento deverá ser enviado ao WhatsApp para o número (83) 99350-2181. O pagamento deve ser efetuado até o dia {contrato.dia_vencimento || 17} (DEZESSETE) de cada mês subsequente ao vencido.</p>
              <p className="mt-1">O valor do aluguel será reajustado anualmente conforme a variação do IGPM, IGP, IPC ou {contrato.indice_reajuste || "IPCA"}. Na ausência desses índices, será aplicada a média da variação inflacionária anual vigente.</p>
            </div>

            <div>
              <h3 className="font-bold uppercase">CLÁUSULA 4ª – DAS DESPESAS E OBRIGAÇÕES DO LOCATÁRIO</h3>
              <p>Todas as despesas diretamente ligadas à conservação e uso do imóvel, como água, energia elétrica, telefone, IPTU, taxas e tributos, serão de responsabilidade exclusiva do locatário.</p>
              <p className="mt-1">O locatário deverá, em até 5 (CINCO) dias da assinatura deste contrato, providenciar junto às concessionárias a transferência das contas de água, luz e internet para seu nome, sob pena de infração contratual. O locatário responderá por todas as contas durante a locação, ainda que lançadas em nome de terceiros, bem como por eventuais indenizações decorrentes de danos morais ou materiais.</p>
              <p className="mt-1">O não pagamento do aluguel até a data de vencimento acarretará multa de 10% (DEZ POR CENTO) sobre o valor devido, além de juros de mora de 1% (UM POR CENTO) ao mês e correção monetária.</p>
            </div>

            <div>
              <h3 className="font-bold uppercase">CLÁUSULA 5ª – DO USO DO IMÓVEL</h3>
              <p>O imóvel destina-se exclusivamente para fins residenciais. É vedado ao locatário sublocar, ceder ou dar destinação diversa ao imóvel sem autorização expressa do locador. O imóvel foi entregue em perfeito estado, com instalações elétricas e hidráulicas funcionando e pintura em boas condições.</p>
            </div>

            <div>
              <h3 className="font-bold uppercase">CLÁUSULA 6ª – DAS BENFEITORIAS</h3>
              <p>Qualquer benfeitoria ou modificação deverá ser previamente autorizada pelo locador. Caso o locatário realize melhorias sem autorização, o locador poderá exigir o retorno do imóvel ao estado original. As benfeitorias realizadas permanecerão integradas ao imóvel, sem direito de indenização ou retenção.</p>
            </div>

            <div>
              <h3 className="font-bold uppercase">CLÁUSULA 7ª – DA DEVOLUÇÃO DO IMÓVEL</h3>
              <p>Ao término da locação, o imóvel deverá ser devolvido nas mesmas condições em que foi recebido: limpo, pintado, com instalações elétricas, hidráulicas, ar-condicionado, ventiladores, portas, janelas, fechaduras e demais acessórios em perfeito estado de funcionamento.</p>
            </div>

            <div>
              <h3 className="font-bold uppercase">CLÁUSULA 8ª – DA PRORROGAÇÃO</h3>
              <p>Caso o locatário permaneça no imóvel após o término do prazo contratual, o contrato será automaticamente prorrogado por tempo indeterminado, podendo o locador rescindi-lo mediante notificação por escrito, com prazo de 30 (TRINTA) dias para desocupação.</p>
            </div>

            <div>
              <h3 className="font-bold uppercase">CLÁUSULA 9ª – DO DIREITO DE PREFERÊNCIA E VISTORIAS</h3>
              <p>Se o locador desejar vender o imóvel, deverá oferecer preferência ao locatário por escrito, que terá 30 (TRINTA) dias para manifestar interesse. O locador poderá realizar vistorias periódicas, mediante aviso prévio, para verificar o estado de conservação do imóvel.</p>
            </div>

            <div>
              <h3 className="font-bold uppercase">CLÁUSULA 10ª – DO SEGURO</h3>
              <p>Recomenda-se ao locatário contratar seguro contra incêndio junto a seguradora idônea, para cobertura de eventuais danos ao imóvel.</p>
            </div>

            <div>
              <h3 className="font-bold uppercase">CLÁUSULA 11ª – DAS PENALIDADES E MULTAS</h3>
              <p>O descumprimento de qualquer cláusula contratual sujeitará a parte infratora ao pagamento de multa equivalente a 3 (TRÊS) meses de aluguel vigente, sem prejuízo de eventuais perdas e danos.</p>
            </div>

            <div>
              <h3 className="font-bold uppercase">CLÁUSULA 12ª – DA RESCISÃO</h3>
              <p>O presente contrato poderá ser rescindido em caso de sinistro, incêndio, desapropriação ou qualquer fato que impossibilite o uso do imóvel. Em caso de rescisão antecipada por parte do locatário, este deverá pagar multa equivalente a 3 (TRÊS) meses de aluguel vigente.</p>
            </div>

            <div>
              <h3 className="font-bold uppercase">CLÁUSULA 13ª – DOS FIADORES</h3>
              <p>Os fiadores acima qualificados obrigam-se como principais pagadores, renunciando aos benefícios previstos nos artigos 827 e 835 do Código Civil, permanecendo responsáveis até a entrega definitiva das chaves.</p>
            </div>

            <div>
              <h3 className="font-bold uppercase">CLÁUSULA 14ª – DO FORO</h3>
              <p>Fica eleito o foro da cidade de Santa Luzia – PB para dirimir quaisquer controvérsias oriundas deste contrato.</p>
            </div>
          </div>

          <p className="mt-8">
            E por estarem assim justas e contratadas, assinam o presente contrato em 2 (DUAS) vias de igual teor e forma, juntamente com as testemunhas abaixo.
          </p>

          <p className="mt-6 text-center font-semibold">
            Santa Luzia – PB, {dataAssinaturaExtenso}.
          </p>

          <div className="mt-14 space-y-10 text-xs font-sans flex flex-col items-center">
            
            <div className="w-full max-w-md text-center break-inside-avoid">
              <div className="border-t border-black pt-2 uppercase font-semibold">
                PAULO SÉRGIO DE SOUZA TORRES<br />
                <span className="font-normal text-gray-700">Locador</span>
              </div>
            </div>

            <div className="w-full max-w-md text-center break-inside-avoid">
              <div className="border-t border-black pt-2 uppercase font-semibold">
                {inquilino.nome || "—"}<br />
                <span className="font-normal text-gray-700">Locatária</span>
              </div>
            </div>

            {contrato.fiador_1_nome && (
              <div className="w-full max-w-md text-center break-inside-avoid">
                <div className="border-t border-black pt-2 uppercase font-semibold">
                  {contrato.fiador_1_nome}<br />
                  <span className="font-normal text-gray-700">Fiador(a) 1</span>
                </div>
              </div>
            )}

            {contrato.fiador_2_nome && (
              <div className="w-full max-w-md text-center break-inside-avoid">
                <div className="border-t border-black pt-2 uppercase font-semibold">
                  {contrato.fiador_2_nome}<br />
                  <span className="font-normal text-gray-700">Fiador(a) 2</span>
                </div>
              </div>
            )}

            <div className="w-full max-w-xl pt-6 space-y-6 break-inside-avoid">
              <p className="font-bold text-center mb-4">Testemunhas:</p>
              <div className="space-y-6">
                <div className="border-t border-black pt-2">
                  <p>Nome: __________________________________________________</p>
                  <p className="mt-1">CPF: ___________________________________________________</p>
                </div>
                <div className="border-t border-black pt-2">
                  <p>Nome: __________________________________________________</p>
                  <p className="mt-1">CPF: ___________________________________________________</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  );
}