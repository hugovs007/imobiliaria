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
          margin: 23mm 10mm 23mm 10mm;
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
            max-width: 320px;
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
                CONTRATO DE LOCACAO RESIDENCIAL
              </h1>

              <div className="mb-4 space-y-1.5">
                <p>
                  <strong>LOCADOR:</strong> Paulo Sergio de Souza Torres, brasileiro, casado,
                  empresario, portador do CPF n 930.952.604-15, residente na Rua Jose Bonifacio
                  Nobrega, n 817, apartamento 103, Bairro Sao Jose, Santa Luzia - PB.
                </p>
                <p>
                  <strong>LOCATARIO:</strong> <span className="uppercase">{inquilino.nome || "—"}</span>,
                  {inquilino.nacionalidade || "brasileira"}, {inquilino.estado_civil || "solteiro(a)"},
                  portador(a) do CPF n {inquilino.cpf || "—"}. Contato: {inquilino.telefone || "—"}.
                </p>

                <div>
                  <strong>FIADORES:</strong>
                  {contrato.fiador_1_nome ? (
                    <ol className="mt-2 pl-5">
                      <li className="mb-2">
                        {contrato.fiador_1_nome}, {contrato.fiador_1_estado_civil || "—"},
                        {contrato.fiador_1_profissao || "—"}, residente na {contrato.fiador_1_endereco || "—"},
                        portador do CPF n {contrato.fiador_1_cpf || "—"}. Contato: {contrato.fiador_1_telefone || "—"}
                      </li>
                      {contrato.fiador_2_nome && (
                        <li className="mt-2">
                          {contrato.fiador_2_nome}, {contrato.fiador_2_estado_civil || "—"},
                          {contrato.fiador_2_profissao || "—"}, residente na {contrato.fiador_2_endereco || "—"},
                          portador do CPF n {contrato.fiador_2_cpf || "—"}. Contato: {contrato.fiador_2_telefone || "—"}
                        </li>
                      )}
                    </ol>
                  ) : (
                    <p className="mt-2 italic text-black/70">Nenhum fiador cadastrado neste contrato.</p>
                  )}
                </div>
              </div>

              <p className="mb-3">
                As partes acima identificadas celebram o presente <strong>CONTRATO DE LOCACAO RESIDENCIAL</strong>,
                que se regera pelas clausulas e condicoes seguintes.
              </p>

              <div className="space-y-3">
                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLAUSULA 1 - DO IMOVEL</h3>
                  <p className="mb-2">O imovel objeto deste contrato esta localizado na {enderecoImovel}.</p>
                  <p>
                    O imovel e entregue na data da assinatura do contrato pelo locador ao locatario, que se
                    obriga a devolve-lo com todos os utensilios e acessorios, tais como ar-condicionado com
                    manutencao em dia, ventilador de teto com lampadas, portas, portoes, janelas e fechaduras
                    em perfeitas condicoes de funcionamento, limpo e conservado, ainda que o contrato seja
                    rescindido antecipadamente.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLAUSULA 2 - DO PRAZO</h3>
                  <p>
                    O prazo da locacao e de {contrato.periodicidade_reajuste_meses || 12} (DOZE) meses, com inicio
                    em <strong>{dataInicioExtenso}</strong> e termino em <strong>{dataFimExtenso}</strong>.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLAUSULA 3 - DO VALOR E FORMA DE PAGAMENTO</h3>
                  <p>
                    O aluguel mensal e de <strong>R$ {valorAluguel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({numeroParaExtenso(valorAluguel)})</strong>,
                    devendo ser pago via PIX para o Sr. Paulo Sergio de Souza Torres, de chave PIX formato CPF
                    930.952.604-15, Banco do Brasil.
                  </p>
                  <p className="mt-2">
                    O comprovante de pagamento devera ser enviado ao WhatsApp para o numero (83) 99350-2181.
                    O pagamento deve ser efetuado ate o dia {contrato.dia_vencimento || 17} (DEZESSETE) de cada
                    mes subsequente ao vencido.
                  </p>
                  <p className="mt-2">
                    O valor do aluguel sera reajustado anualmente conforme a variacao do IGPM, IGP, IPC ou
                    {contrato.indice_reajuste || "IPCA"}. Na ausencia desses indices, sera aplicada a media da
                    variacao inflacionaria anual vigente.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLAUSULA 4 - DAS DESPESAS E OBRIGACOES DO LOCATARIO</h3>
                  <p>
                    Todas as despesas diretamente ligadas a conservacao e uso do imovel, como agua, energia
                    eletrica, telefone, IPTU, taxas e tributos, serao de responsabilidade exclusiva do locatario.
                  </p>
                  <p className="mt-2">
                    O locatario devera, em ate 5 (CINCO) dias da assinatura deste contrato, providenciar junto as
                    concessionarias a transferencia das contas de agua, luz e internet para seu nome, sob pena de
                    infraccao contratual. O locatario respondera por todas as contas durante a locacao, ainda que
                    lancadas em nome de terceiros, bem como por eventuais indenizacoes decorrentes de danos morais
                    ou materiais.
                  </p>
                  <p className="mt-2">
                    O nao pagamento do aluguel ate a data de vencimento acarretara multa de 10% (DEZ POR CENTO)
                    sobre o valor devido, alem de juros de mora de 1% (UM POR CENTO) ao mes e correcao monetaria.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLAUSULA 5 - DO USO DO IMOVEL</h3>
                  <p>
                    O imovel destina-se exclusivamente para fins residenciais. E vedado ao locatario sublocar,
                    ceder ou dar destinacao diversa ao imovel sem autorizacao expressa do locador. O imovel foi
                    entregue em perfeito estado, com instalacoes eletricas e hidraulicas funcionando e pintura em
                    boas condicoes.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLAUSULA 6 - DAS BENFEITORIAS</h3>
                  <p>
                    Qualquer benfeitoria ou modificacao devera ser previamente autorizada pelo locador. Caso o
                    locatario realize melhorias sem autorizacao, o locador podera exigir o retorno do imovel ao
                    estado original. As benfeitorias realizadas permanecerao integradas ao imovel, sem direito de
                    indenizacao ou retencao.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLAUSULA 7 - DA DEVOLUCAO DO IMOVEL</h3>
                  <p>
                    Ao termino da locacao, o imovel devera ser devolvido nas mesmas condicoes em que foi recebido:
                    limpo, pintado, com instalacoes eletricas, hidraulicas, ar-condicionado, ventiladores, portas,
                    janelas, fechaduras e demais acessorios em perfeito estado de funcionamento.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLAUSULA 8 - DA PRORROGACAO</h3>
                  <p>
                    Caso o locatario permaneca no imovel apos o termino do prazo contratual, o contrato sera
                    automaticamente prorrogado por tempo indeterminado, podendo o locador rescindi-lo mediante
                    notificacao por escrito, com prazo de 30 (TRINTA) dias para desocupacao.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLAUSULA 9 - DO DIREITO DE PREFERENCIA E VISTORIAS</h3>
                  <p>
                    Se o locador desejar vender o imovel, devera oferecer preferencia ao locatario por escrito,
                    que tera 30 (TRINTA) dias para manifestar interesse. O locador podera realizar vistorias
                    periodicas, mediante aviso previo, para verificar o estado de conservacao do imovel.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLAUSULA 10 - DO SEGURO</h3>
                  <p>
                    Recomenda-se ao locatario contratar seguro contra incendio junto a seguradora idonea, para
                    cobertura de eventuais danos ao imovel.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLAUSULA 11 - DAS PENALIDADES E MULTAS</h3>
                  <p>
                    O descumprimento de qualquer clausula contratual sujeitara a parte infratora ao pagamento de
                    multa equivalente a 3 (TRES) meses de aluguel vigente, sem prejuizo de eventuais perdas e
                    danos.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLAUSULA 12 - DA RESCISAO</h3>
                  <p>
                    O presente contrato podera ser rescindido em caso de sinistro, incendio, desapropriacao ou
                    qualquer fato que impossibilite o uso do imovel. Em caso de rescissao antecipada por parte do
                    locatario, este devera pagar multa equivalente a 3 (TRES) meses de aluguel vigente.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLAUSULA 13 - DOS FIADORES</h3>
                  <p>
                    Os fiadores acima qualificados obrigam-se como principais pagadores, renunciando aos
                    beneficios previstos nos artigos 827 e 835 do Codigo Civil, permanecendo responsaveis ate a
                    entrega definitiva das chaves.
                  </p>
                </section>

                <section className="contract-section">
                  <h3 className="mb-2 text-[12pt] font-bold uppercase">CLAUSULA 14 - DO FORO</h3>
                  <p>
                    Fica eleito o foro da cidade de Santa Luzia - PB para dirimir quaisquer controversias
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
