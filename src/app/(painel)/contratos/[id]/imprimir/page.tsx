import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PrintContractButton } from "./PrintContractButton";

export const dynamic = "force-dynamic";

function formatarDataPorExtenso(dataRaw: string | null | undefined): string {
  if (!dataRaw) return "data de assinatura";

  try {
    const dataObj = new Date(dataRaw + (dataRaw.includes("T") ? "" : "T00:00:00"));
    if (Number.isNaN(dataObj.getTime())) return "data de assinatura";

    const meses = [
      "janeiro",
      "fevereiro",
      "março",
      "abril",
      "maio",
      "junho",
      "julho",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "dezembro",
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
  if (Number.isNaN(valor) || valor <= 0) return "ZERO REAIS";

  const unidades = [
    "",
    "UM",
    "DOIS",
    "TRES",
    "QUATRO",
    "CINCO",
    "SEIS",
    "SETE",
    "OITO",
    "NOVE",
    "DEZ",
    "ONZE",
    "DOZE",
    "TREZE",
    "CATORZE",
    "QUINZE",
    "DEZESSEIS",
    "DEZESSETE",
    "DEZOITO",
    "DEZENOVE",
  ];

  const dezenas = [
    "",
    "",
    "VINTE",
    "TRINTA",
    "QUARENTA",
    "CINQUENTA",
    "SESSENTA",
    "SETENTA",
    "OITENTA",
    "NOVENTA",
  ];

  const centenas = [
    "",
    "CENTO",
    "DUZENTOS",
    "TREZENTOS",
    "QUATROCENTOS",
    "QUINHENTOS",
    "SEISCENTOS",
    "SETECENTOS",
    "OITOCENTOS",
    "NOVECENTOS",
  ];

  function converterInteiro(num: number): string {
    if (num === 0) return "";
    if (num === 100) return "CEM";
    if (num < 20) return unidades[num];
    if (num < 100) {
      const d = Math.floor(num / 10);
      const u = num % 10;
      return dezenas[d] + (u > 0 ? ` E ${unidades[u]}` : "");
    }

    const c = Math.floor(num / 100);
    const resto = num % 100;
    return centenas[c] + (resto > 0 ? ` E ${converterInteiro(resto)}` : "");
  }

  const parteInteira = Math.floor(valor);
  const centavos = Math.round((valor - parteInteira) * 100);

  let resultado = "";
  if (parteInteira === 1) {
    resultado = "UM REAL";
  } else if (parteInteira > 0) {
    resultado = `${converterInteiro(parteInteira)} REAIS`;
  }

  if (centavos > 0) {
    resultado += (resultado ? " E " : "") + `${converterInteiro(centavos)} ${centavos === 1 ? "CENTAVO" : "CENTAVOS"}`;
  }

  return resultado;
}

export default async function ImprimirContratoPage(props: { params: Promise<{ id: string }> }) {
  const { id: contratoId } = await props.params;

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
    `${imovel.cidade || "Santa Luzia"} - ${imovel.uf || imovel.estado || "PB"}`,
    imovel.cep ? `CEP ${imovel.cep}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const dataInicioExtenso = formatarDataPorExtenso(contrato.data_inicio);
  const dataFimExtenso = formatarDataPorExtenso(contrato.data_fim);
  const dataAssinaturaExtenso = formatarDataPorExtenso(
    contrato.data_inicio || new Date().toISOString().split("T")[0],
  );

  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 23mm 10mm 21mm 10mm;
          @top-left { content: ""; }
          @top-center { content: ""; }
          @top-right { content: ""; }
          @bottom-left { content: ""; }
          @bottom-right { content: ""; }
          @bottom-center { content: counter(page); font-size: 9pt; color: #000; }
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body {
            min-height: auto !important;
          }

          .contract-page {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .contract-sheet {
            width: 100% !important;
            max-width: none !important;
            min-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }

          .contract-section {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          .signature-block,
          .witness-block {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .signature-block {
            min-height: 72px;
            margin-top: 0;
            margin-bottom: 0;
          }

          .witness-block {
            margin-top: 0;
          }

          .signature-stack {
            display: flex;
            flex-direction: column;
            gap: 4rem;
          }

          .signature-block {
            width: 100%;
            max-width: 20px;
          }

          .no-print,
          .print-hidden,
          button,
          nav,
          aside,
          header:not(.contract-header),
          footer:not(.contract-footer) {
            display: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-stone-100 p-4 print:bg-white print:p-0">
        <div className="mb-6 text-right print:hidden">
          <PrintContractButton />
        </div>

        <article className="contract-page mx-auto w-full max-w-[210mm] print:mx-0 print:max-w-none">
          <div className="contract-sheet bg-white p-6 shadow-sm ring-1 ring-black/5 print:p-[20mm] print:shadow-none print:ring-0 print:rounded-none print:border-none">
            <div className="font-serif leading-relaxed text-justify text-[12pt] text-black">
              <h1 className="mb-6 text-center text-[14pt] font-bold uppercase tracking-[1px]">
                CONTRATO DE LOCAÇÃO RESIDENCIAL
              </h1>

              <div className="mb-4 space-y-1.5">
                <p>
                  <strong>LOCADOR:</strong> Paulo Sergio de Souza Torres, brasileiro, casado,
                  empresário, inscrito no CPF sob o nº 930.952.604-15, residente à Rua Jose Bonifacio
                  Nobrega, nº 817, apartamento 103, Bairro Sao Jose, Santa Luzia - PB.
                </p>
                <p>
                  <strong>LOCATÁRIO:</strong> <span className="uppercase">{inquilino.nome || "—"} </span>, {inquilino.nacionalidade || "brasileiro(a)"}, {inquilino.estado_civil || "solteiro(a)"}, 
                  inscrito(a) no CPF sob o nº {inquilino.cpf_cnpj || "—"}, contato: {inquilino.telefone || "—"}.
                </p>

                <div>
                  <strong>FIADORES:</strong>
                  {contrato.fiador_1_nome ? (
                    <ol className="mt-2 pl-5">
                      <li className="mb-2">
                        {contrato.fiador_1_nome}, {contrato.fiador_1_estado_civil || "—"}, {contrato.fiador_1_profissao || "—"}, residente à {contrato.fiador_1_endereco || "—"},
                        inscrito no CPF sob o nº {contrato.fiador_1_cpf || "—"}, contato: {contrato.fiador_1_telefone || "—"}
                      </li>
                      {contrato.fiador_2_nome && (
                        <li className="mt-2">
                          {contrato.fiador_2_nome}, {contrato.fiador_2_estado_civil || "—"}, {contrato.fiador_2_profissao || "—"}, residente à {contrato.fiador_2_endereco || "—"},
                          inscrito no CPF sob o nº {contrato.fiador_2_cpf || "—"}, contato: {contrato.fiador_2_telefone || "—"}
                        </li>
                      )}
                    </ol>
                  ) : (
                    <p className="mt-2 italic text-black/70">Nenhum fiador cadastrado neste contrato.</p>
                  )}
                </div>
              </div>

              <p className="mb-3">
                As partes acima identificadas celebram o presente <strong>CONTRATO DE LOCAÇÃO RESIDENCIAL</strong>,
                que se regerá pelas cláusulas e condições seguintes.
              </p>

              <div className="space-y-3">
                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 1 - DO IMÓVEL</h3>
                  <p className="mb-2">O imóvel objeto deste contrato está localizado na {enderecoImovel}.</p>
                  <p>
                    O imóvel é entregue na data da assinatura do contrato pelo locador ao locatário, que se
                    obriga a devolvê-lo com todos os utensílios e acessórios, tais como ar-condicionado com
                    manutenção em dia, ventilador de teto com lâmpadas, portas, portões, janelas e fechaduras
                    em perfeitas condições de funcionamento, limpo e conservado, ainda que o contrato seja
                    rescindido antecipadamente.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 2 - DO PRAZO</h3>
                  <p>
                    O prazo da locação é de {contrato.periodicidade_reajuste_meses || 12} (doze) meses, com início
                    em <strong>{dataInicioExtenso}</strong> e término em <strong>{dataFimExtenso}</strong>.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 3 - DO VALOR E FORMA DE PAGAMENTO</h3>
                  <p>
                    O aluguel mensal é de <strong>R$ {valorAluguel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({numeroParaExtenso(valorAluguel)})</strong>,
                    devendo ser pago via PIX para o Sr. Paulo Sergio de Souza Torres, de chave PIX formato CPF
                    930.952.604-15, Banco do Brasil.
                  </p>
                  <p className="mt-2">
                    O comprovante de pagamento deverá ser enviado ao WhatsApp para o número (83) 99350-2181.
                    O pagamento deve ser efetuado até o dia {contrato.dia_vencimento || 17} de cada
                    mês subsequente ao vencido.
                  </p>
                  <p className="mt-2">
                    O valor do aluguel será reajustado anualmente conforme a variação do IGPM, IGP, IPC ou {contrato.indice_reajuste || "IPCA"}. 
                    Na ausência desses índices, será aplicada a média davariação inflacionária anual vigente.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 4 - DAS DESPESAS E OBRIGAÇÕES DO LOCATÁRIO</h3>
                  <p>
                    Todas as despesas diretamente ligadas à conservação e uso do imóvel, como água, energia
                    elétrica, telefone, IPTU, taxas e tributos, serão de responsabilidade exclusiva do locatário.
                  </p>
                  <p className="mt-2">
                    O locatário deverá, em até 5 (cinco) dias da assinatura deste contrato, providenciar junto às
                    concessionárias a transferência das contas de água, luz e internet para seu nome, sob pena de
                    infração contratual. O locatário responderá por todas as contas durante a locação, ainda que
                    lançadas em nome de terceiros, bem como por eventuais indenizações decorrentes de danos morais
                    ou materiais.
                  </p>
                  <p className="mt-2">
                    O não pagamento do aluguel até a data de vencimento acarretará multa de 10 % (dez por cento)
                    sobre o valor devido, além de juros de mora de 1 % (um por cento) ao mês e correção monetária.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 5 - DO USO DO IMÓVEL</h3>
                  <p>
                    O imóvel destina-se exclusivamente para fins residenciais. É vedado ao locatário sublocar,
                    ceder ou dar destinação diversa ao imóvel sem autorização expressa do locador. O imóvel foi
                    entregue em perfeito estado, com instalações elétricas e hidráulicas funcionando e pintura em
                    boas condições.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 6 - DAS BENFEITORIAS</h3>
                  <p>
                    Qualquer benfeitoria ou modificação deverá ser previamente autorizada pelo locador. Caso o
                    locatário realize melhorias sem autorização, o locador poderá exigir o retorno do imóvel ao
                    estado original. As benfeitorias realizadas permanecerão integradas ao imóvel, sem direito de
                    indenização ou retenção.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 7 - DA DEVOLUÇÃO DO IMÓVEL</h3>
                  <p>
                    Ao término da locação, o imóvel deverá ser devolvido nas mesmas condições em que foi recebido:
                    limpo, pintado, com instalações elétricas, hidráulicas, ar-condicionado, ventiladores, portas,
                    janelas, fechaduras e demais acessórios em perfeito estado de funcionamento.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 8 - DA PRORROGAÇÃO</h3>
                  <p>
                    Caso o locatário permaneça no imóvel após o término do prazo contratual, o contrato será
                    automaticamente prorrogado por tempo indeterminado, podendo o locador rescindi-lo mediante
                    notificação por escrito, com prazo de 30 (trinta) dias para desocupação.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 9 - DO DIREITO DE PREFERÊNCIA E VISTORIAS</h3>
                  <p>
                    Se o locador desejar vender o imóvel, deverá oferecer preferência ao locatário por escrito,
                    que terá 30 (trinta) dias para manifestar interesse. O locador poderá realizar vistorias
                    periódicas, mediante aviso prévio, para verificar o estado de conservação do imóvel.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 10 - DO SEGURO</h3>
                  <p>
                    Recomenda-se ao locatário contratar seguro contra incêndio junto à seguradora idônea, para
                    cobertura de eventuais danos ao imóvel.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 11 - DAS PENALIDADES E MULTAS</h3>
                  <p>
                    O descumprimento de qualquer cláusula contratual sujeitará a parte infratora ao pagamento de
                    multa equivalente a 3 (três) meses de aluguel vigente, sem prejuízo de eventuais perdas e
                    danos.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 12 - DA RESCISÃO</h3>
                  <p>
                    O presente contrato poderá ser rescindido em caso de sinistro, incêndio, desapropriação ou
                    qualquer fato que impossibilite o uso do imóvel. Em caso de rescisão antecipada por parte do
                    locatário, este deverá pagar multa equivalente a 3 (três) meses de aluguel vigente.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 13 - DOS FIADORES</h3>
                  <p>
                    Os fiadores acima qualificados obrigam-se como principais pagadores, renunciando aos
                    benefícios previstos nos artigos 827 e 835 do Código Civil, permanecendo responsáveis até a
                    entrega definitiva das chaves.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 14 - DO FORO</h3>
                  <p>
                    Fica eleito o foro da cidade de Santa Luzia - PB para dirimir quaisquer controvérsias
                    oriundas deste contrato.
                  </p>
                  
                </section>
              </div>
              
              <p className="mt-5 text-center font-semibold leading-relaxed">
                Santa Luzia - PB, {dataAssinaturaExtenso}.
              </p>

              <div className="signature-stack mt-10">
                <div className="signature-block mx-auto min-h-[72px]">
                  <div className="border-t border-black pt-3 text-center font-bold uppercase">
                    PAULO SERGIO DE SOUZA TORRES
                    <div className="mt-1 text-[10pt] font-normal normal-case text-black/70">Locador</div>
                  </div>
                </div>

                <div className="signature-block mx-auto min-h-[72px]">
                  <div className="border-t border-black pt-3 text-center font-bold uppercase">
                    {inquilino.nome || "—"}
                    <div className="mt-1 text-[10pt] font-normal normal-case text-black/70">Locatario(a)</div>
                  </div>
                </div>

                {contrato.fiador_1_nome && (
                  <div className="signature-block mx-auto min-h-[72px]">
                    <div className="border-t border-black pt-3 text-center font-bold uppercase">
                      {contrato.fiador_1_nome}
                      <div className="mt-1 text-[10pt] font-normal normal-case text-black/70">Fiador(a) 1</div>
                    </div>
                  </div>
                )}

                {contrato.fiador_2_nome && (
                  <div className="signature-block mx-auto min-h-[72px]">
                    <div className="border-t border-black pt-3 text-center font-bold uppercase">
                      {contrato.fiador_2_nome}
                      <div className="mt-1 text-[10pt] font-normal normal-case text-black/70">Fiador(a) 2</div>
                    </div>
                  </div>
                )}

                <div className="witness-block mx-auto max-w-[420px] pt-6">
                  <p className="mb-6 text-center font-bold uppercase">Testemunhas</p>
                  <div className="space-y-8">
                    <div className="border-t border-black pt-2 text-[10pt]">
                      <p className="m-0">Nome: __________________________________________________</p>
                      <p className="m-0 mt-1">CPF: ___________________________________________________</p>
                    </div>
                    <div className="border-t border-black pt-2 text-[10pt]">
                      <p className="m-0">Nome: __________________________________________________</p>
                      <p className="m-0 mt-1">CPF: ___________________________________________________</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </article>
      </div>
    </>
  );
}
