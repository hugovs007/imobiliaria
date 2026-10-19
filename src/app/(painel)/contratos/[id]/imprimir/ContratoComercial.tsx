"use client";

import type { ReactNode } from "react";
import { numeroParaExtenso } from "@/lib/valor-extenso";

interface ContratoComercialProps {
  contrato: any;
  imovel: any;
  inquilino: any;
  valorAluguel: number;
  enderecoImovel: string;
  dataInicioExtenso: string;
  dataFimExtenso: string;
  dataAssinaturaExtenso: string;
}

function formatarEnderecoLocador(): string {
  return "Rua Bonifácio Nóbrega, nº 817-Apto103, Bairro São José, Cidade Santa Luzia – PB, CEP 58.600-000";
}

function formatarTelefoneLocador(): string {
  return "83 9 9971-7478";
}

function formatarPixLocador(): string {
  return "CPF 930.952.604-15, Banco do Brasil";
}

function formatarWhatsAppLocador(): string {
  return "(83) 99350-2181";
}

export function ContratoComercial({ 
  contrato, 
  imovel, 
  inquilino, 
  valorAluguel, 
  enderecoImovel, 
  dataInicioExtenso, 
  dataFimExtenso, 
  dataAssinaturaExtenso 
}: ContratoComercialProps) {
  const valorAluguelExtenso = numeroParaExtenso(valorAluguel);
  const diaVencimento = contrato.dia_vencimento || 1;
  const indiceReajuste = contrato.indice_reajuste || "IGP-M";
  const periodicidadeReajuste = contrato.periodicidade_reajuste_meses || 12;

  // Fiador 1
  const fiador1Nome = contrato.fiador_1_nome || "";
  const fiador1EstadoCivil = contrato.fiador_1_estado_civil || "";
  const fiador1Profissao = contrato.fiador_1_profissao || "";
  const fiador1Endereco = contrato.fiador_1_endereco || "";
  const fiador1Cpf = contrato.fiador_1_cpf || "";
  const fiador1Telefone = contrato.fiador_1_telefone || "";

  // Fiador 2
  const fiador2Nome = contrato.fiador_2_nome || "";
  const fiador2EstadoCivil = contrato.fiador_2_estado_civil || "";
  const fiador2Profissao = contrato.fiador_2_profissao || "";
  const fiador2Endereco = contrato.fiador_2_endereco || "";
  const fiador2Cpf = contrato.fiador_2_cpf || "";
  const fiador2Telefone = contrato.fiador_2_telefone || "";

  // Inquilino details
  const inquilinoNacionalidade = inquilino.nacionalidade || "brasileiro(a)";
  const inquilinoEstadoCivil = inquilino.estado_civil || "solteiro(a)";
  const inquilinoCpf = inquilino.cpf_cnpj || "—";
  const inquilinoTelefone = inquilino.telefone || "—";
  const inquilinoRg = inquilino.rg || "—";
  const inquilinoCnh = inquilino.cnh || "—";

  return (
    <div className="font-serif leading-relaxed text-justify text-[12pt] text-black">
      <h1 className="mb-6 text-center text-[14pt] font-bold uppercase tracking-[1px]">
        CONTRATO DE LOCAÇÃO COMERCIAL
      </h1>

      <div className="mb-4 space-y-1.5">
        <p>
          <strong>LOCADOR:</strong> Paulo Sergio de Souza Torres, brasileiro, casado,
          empresário, inscrito no CPF sob o nº 930.952.604-15, residente à {formatarEnderecoLocador()}.
          Telefone: {formatarTelefoneLocador()}.
        </p>
        <p>
          <strong>LOCATÁRIO:</strong> <span className="uppercase">{inquilino.nome || "—"} </span>, {inquilinoNacionalidade}, {inquilinoEstadoCivil}, 
          portador da Identidade n° {inquilinoRg}, CNH {inquilinoCnh} e CPF n° {inquilinoCpf}, 
          residente e domiciliado na {inquilino.endereco || "—"}, contato: {inquilinoTelefone}.
        </p>

        {fiador1Nome && (
          <div>
            <strong>FIADOR(A):</strong> {fiador1Nome}, {fiador1EstadoCivil}, {fiador1Profissao}, 
            portador da Identidade n° {inquilinoRg} e CPF n° {fiador1Cpf}, 
            residente e domiciliado na {fiador1Endereco}. Tel {fiador1Telefone}.
          </div>
        )}

        {fiador2Nome && (
          <div className="mt-2">
            <strong>FIADOR(A) 2:</strong> {fiador2Nome}, {fiador2EstadoCivil}, {fiador2Profissao}, 
            portador da Identidade n° {inquilinoRg} e CPF n° {fiador2Cpf}, 
            residente e domiciliado na {fiador2Endereco}. Tel {fiador2Telefone}.
          </div>
        )}
      </div>

      <p className="mb-3">
        Tem entre os mesmos, da maneira justa e acordada, o presente <strong>INSTRUMENTO PARTICULAR DE LOCAÇÃO COMERCIAL</strong>,
        ficando desde já aceito, pelas cláusulas abaixo descritas.
      </p>

      {/* CLÁUSULA 1 – OBJETO DO CONTRATO */}
      <section className="contract-section mb-4">
        <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 1 – OBJETO DO CONTRATO</h3>
        <p className="mb-2">
          O presente tem como OBJETO, um imóvel de propriedade do Sr. PAULO SÉRGIO DE SOUZA TORRES, 
          situado na {enderecoImovel}.
        </p>
        <p className="text-sm">
          <strong>PARÁGRAFO ÚNICO:</strong> O imóvel entregue na data da assinatura deste contrato, pelo LOCADOR ao LOCATÁRIO, 
          estará obrigado a devolver o imóvel e utensílios, tais como, portas, portão, janelas e fechaduras nas condições 
          em que recebeu, limpo e conservado, e em pleno funcionamento, ao término do contrato, ainda que rescindido antecipadamente.
        </p>
      </section>

      {/* CLÁUSULA 2 – PRAZO DE LOCAÇÃO */}
      <section className="contract-section mb-4">
        <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 2 – PRAZO DE LOCAÇÃO</h3>
        <p>
          A presente locação terá o lapso temporal de validade de {periodicidadeReajuste} meses, a iniciar-se no dia <strong>{dataInicioExtenso}</strong> e findar-se no dia <strong>{dataFimExtenso}</strong> data a qual o imóvel 
          deverá ser devolvido nas condições previstas no PARÁGRAFO QUARTO DA CLÁUSULA 4, efetivando-se com a entrega 
          das chaves, independentemente de aviso ou qualquer outra medida judicial ou extrajudicial.
        </p>
      </section>

      {/* CLÁUSULA 3 – VALOR DO ALUGUEL, DESPESAS E TRIBUTOS */}
      <section className="contract-section mb-4">
        <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 3 – VALOR DO ALUGUEL, DESPESAS E TRIBUTOS</h3>
        <p className="mb-2">
          Como aluguel mensal, o LOCATÁRIO se obrigará a pagar o valor de <strong>R$ {valorAluguel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({valorAluguelExtenso})</strong>, 
          devendo ser pago via PIX para o Sr. Paulo Sérgio de Souza Torres, de chave PIX formato {formatarPixLocador()}.
        </p>
        <p className="mb-2">
          O comprovante de pagamento deverá ser enviado ao WhatsApp para o número {formatarWhatsAppLocador()}.  
        </p>
        <p className="mb-2">
          O pagamento deve ser efetuado até o dia {diaVencimento} ({numeroParaExtenso(diaVencimento).toLowerCase()}) 
          de cada mês subsequente ao vencido.
        </p>
        <p className="mb-2">
          O valor do aluguel será reajustado anualmente conforme a variação do {indiceReajuste}, IGP, IPC ou IPCA. 
          Na ausência desses índices, será aplicada a média da variação inflacionária anual vigente.
        </p>

        <p className="mt-2 mb-1"><strong>PARÁGRAFO PRIMEIRO – RECIBO:</strong> Fica obrigado o LOCADOR ou seu procurador, a emitir recibo da quantia paga, relacionado pormenorizadamente todos os valores oriundos de juros, ou outra despesa. Emitir-se-á tal recibo, desde que haja a apresentação pelo LOCATÁRIO, dos comprovantes de todas as despesas do imóvel devidamente quitas. Caso o LOCATÁRIO venha a efetuar o pagamento do aluguel através de cheque, restará facultado ao LOCADOR emitir os recibos de pagamento somente após compensação do mesmo.</p>

        <p className="mt-2 mb-1"><strong>PARÁGRAFO SEGUNDO – REAJUSTE:</strong> O valor do aluguel será reajustado anualmente, tendo como base, os índices previstos e acumulados no período anual do ({indiceReajuste} ou IGP ou IPC, ou IPCA), em caso de falta desse índice, o reajustamento do aluguel terá por base a média da variação dos índices inflacionários do ano corrente ao da execução do aluguel, até o primeiro dia anterior ao pagamento de todos os valores devidos. Ocorrendo alguma mudança no âmbito governamental, todos os valores agregados ao aluguel, bem como o próprio aluguel, serão revisto pelas partes.</p>

        <p className="mt-2 mb-1"><strong>PARÁGRAFO TERCEIRO – COBRANÇA:</strong> Faculta no LOCADOR, ou seu procurador, cobrar do LOCATÁRIO, o(s) aluguel(eis), tributo(s) e despesa(s) vencida(s), oriundo(s) deste contrato, utilizando-se para isso, de todos os meios legais admitidos. O(s) cheque(s) utilizado(s) em pagamento, se não compensado(s) até o quinto dia útil contados a partir do vencimento do aluguel, ocasionará(ão) mora do LOCATÁRIO, facultando ao LOCADOR e aplicação do disposto no PARÁGRAFO QUINTO desta CLÁUSULA.</p>

        <p className="mt-2 mb-1"><strong>PARÁGRAFO QUARTO – DESPESAS E TRIBUTOS:</strong> Todas as despesas diretamente ligadas à conservação do imóvel, tais como, água, luz, telefone, IPTU as condominiais que estejam relacionadas ao uso do mesmo, bem como os tributos, ficarão sob a responsabilidade do LOCATÁRIO pelo pagamento de todos, ressalvando-se quanto à contribuição de melhoria.</p>

        <p className="mt-2 mb-1"><strong>PARÁGRAFO QUINTO:</strong> O (A) LOCATÁRIO (A) se obriga a tomar as providências cabíveis junto às concessionárias de serviços públicos, dentro de 05 (CINCO) dias contados da assinatura do presente contrato, a fim de transferir para o seu nome as contas de consumo de luz, água e internet, sob pena de incorrer em infração contratual, respondendo, ademais, por estas contas durante a locação, ainda que lançadas em nome de terceiros, bem como, de eventuais indenizações por dano moral ou material que der causa.</p>

        <p className="mt-2 mb-1"><strong>PARÁGRAFO SEXTO – MULTA:</strong> O LOCATÁRIO: não vindo a efetuar o pagamento do aluguel até a data estipulada no capítulo da CLÁUSULA três, fica obrigado a pagar multa de 10% (dez por cento) sobre o valor do aluguel estipulado neste contrato, bem como juros de mora de 1% (um por cento) ao mês, mais correção monetária.</p>

        <p className="mt-2 mb-1"><strong>PARÁGRAFO SÉTIMO – DO ATRASO NO PAGAMENTO:</strong> Em caso de atraso no pagamento dos aluguéis e não compensando o cheque destinado para tal fim, restará em mora o LOCATÁRIO, ficando responsável por todos os pagamentos previstos neste atraso, sem prejuízo do pagamento da multa, juros de mora e correção monetária. Não configurarão novação ou adição às cláusulas contidas no presente instrumento, os atos de mera tolerância referentes ao atraso no pagamento do aluguel ou quaisquer outros tributos.</p>
      </section>

      {/* CLÁUSULA 4 – UTILIZAÇÃO DOS IMÓVEIS */}
      <section className="contract-section mb-4">
        <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 4 – UTILIZAÇÃO DOS IMÓVEIS</h3>
        <p className="mb-2">
          A presente LOCAÇÃO destina-se restritivamente ao uso do imóvel para fins comerciais, restando proibido ao LOCATÁRIO, 
          sublocá-lo ou usá-lo de forma diferente do previsto, salvo autorização expressa do LOCADOR.
        </p>

        <p className="mt-2 mb-1"><strong>PARÁGRAFO PRIMEIRO – DAS CONDIÇÕES DOS IMÓVEIS:</strong> O imóvel objeto deste contrato será entregue nas condições descritas no auto de vistoria, ou seja, com instalações elétricas e hidráulicas em perfeito funcionamento, com todos os cômodos e paredes pintados, sendo que portas, portões e acessórios se encontram também em funcionamento correto, devendo o LOCATÁRIO mantê-lo desta forma. Fica também acordado, que o imóvel será devolvido nas mesmas condições previstas no auto de vistoria, além de, no ato da entrega das chaves, com todos os tributos e despesas pagas.</p>

        <p className="mt-2 mb-1"><strong>PARÁGRAFO SEGUNDO – RESCISÃO:</strong> Caso o imóvel seja utilizado de forma diversa da locação, restará facultado ao LOCADOR, rescindir o presente contrato de plano, sem gerar direito a indenização ou qualquer ônus por parte deste último. Sem prejuízo da obrigação do LOCATÁRIO de efetuar o pagamento das multas e despesas previstas no PARÁGRAFO SEXTO da CLÁUSULA 3. Salvo autorização expressa do LOCADOR.</p>

        <p className="mt-2 mb-1"><strong>PARÁGRAFO TERCEIRO – BENFEITORIAS E CONSTRUÇÕES:</strong> Qualquer benfeitoria ou construção que seja destinada ao imóvel objeto deste, deverá de imediato, ser submetida a autorização expressa do LOCADOR. Vindo a ser feita benfeitoria, faculta ao LOCADOR aceitá-la ou não restando ao LOCATÁRIO em caso do LOCADOR não aceitá-la, modificar o imóvel da maneira que lhe foi entregue. As benfeitorias, consertos ou reparos farão parte integrante do imóvel, não assistindo ao LOCATÁRIO o direito de retenção ou indenização sobre a mesma.</p>

        <p className="mt-2 mb-1"><strong>PARÁGRAFO QUARTO – DA DEVOLUÇÃO DO IMÓVEL FINDO PRAZO DA LOCAÇÃO:</strong> O LOCATÁRIO restituirá o imóvel locado nas mesmas condições as quais o recebeu, qual seja pintado com tinta látex na cor contida no auto de vistoria, sendo que as instalações elétricas, hidráulicas e acessórias deverão também, estar em perfeitas condições de funcionamento, salvo a deterioração decorrente do uso normal e habitual do imóvel. Os autos de vistoria inicial e final, que farão parte deste contrato conterão assinatura de duas testemunhas, dos contraentes, e do fiador.</p>

        <p className="mt-2 mb-1"><strong>PARÁGRAFO QUINTO – DO CONDOMÍNIO:</strong> Fica desde já ciente o LOCATÁRIO que, em caso de edifício onde haja condomínio, restará o mesmo obrigado por todas as cláusulas constantes na Convenção e no Regulamento Interno existente.</p>
      </section>

      {/* CLÁUSULA 5 – DA PRORROGAÇÃO DO CONTRATO */}
      <section className="contract-section mb-4">
        <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 5 – DA PRORROGAÇÃO DO CONTRATO</h3>
        <p>
          Ultrapassando o contrato, a data prevista, ou seja, tornando-se contrato por tempo indeterminado, poderá o LOCADOR, 
          rescindi-lo a qualquer tempo, desde que ocorra notificação por escrito ao LOCATÁRIO, que ficará compelido a entrega 
          do imóvel dentro do prazo de 30 (trinta) dias, a contar do recebimento da notificação. Ocorrendo prorrogação, o 
          LOCATÁRIO e o LOCADOR ficarão obrigados por todo o teor deste contrato.
        </p>
      </section>

      {/* CLÁUSULA 6 – DIREITO DE PREFERÊNCIA E VISTORIAS ESPORÁDICAS */}
      <section className="contract-section mb-4">
        <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 6 – DIREITO DE PREFERÊNCIA E VISTORIAS ESPORÁDICAS</h3>
        <p className="mb-2">
          Caso o LOCADOR manifeste vontade de vender o imóvel objeto do presente, deverá propor por escrito ao LOCATÁRIO 
          que se obrigará a emitir a resposta em 30 (trinta) dias, a partir da comunicação inicial.
        </p>

        <p className="mt-2 mb-1"><strong>PARÁGRAFO PRIMEIRO:</strong> O LOCATÁRIO permitirá ao LOCADOR, realizar vistorias no imóvel em dia e hora a serem combinados, podendo este último averiguar o funcionamento de todas as instalações e acessórios. Se constando algum vício que possa afetar a estrutura física dos imóveis ficará compelido o LOCATÁRIO a realizar o conserto, no prazo de 15 (Quinze) dias. Não ocorrendo o conserto, o LOCADOR ficará facultado a RESCINDIR O CONTRATO, sem prejuízo dos numerários previsto neste.</p>

        <p className="mt-2 mb-1"><strong>PARÁGRAFO SEGUNDO:</strong> O LOCATÁRIO não se manifestando no prazo estipulado, contido no capítulo desta cláusula, permitirá desde logo ao LOCADOR, vistoriar os imóveis com possíveis pretendentes.</p>
      </section>

      {/* CLÁUSULA 7 – DOS ATOS DE INFORMAÇÃO ENTRE OS CONTRATANTES */}
      <section className="contract-section mb-4">
        <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 7 – DOS ATOS DE INFORMAÇÃO ENTRE OS CONTRATANTES</h3>
        <p>
          As partes integrantes deste contrato ficam desde já acordadas a se comunicarem somente por escrito, através de 
          qualquer meio admitido em direito. Na ausência de qualquer das partes, as mesmas se comprometem desde já deixarem 
          nomeados procuradores, responsáveis para tal fim.
        </p>
      </section>

      {/* CLÁUSULA 8 – DO SEGURO CONTRA INCÊNDIO E OUTRAS PROVIDÊNCIAS */}
      <section className="contract-section mb-4">
        <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 8 – DO SEGURO CONTRA INCÊNDIO E OUTRAS PROVIDÊNCIAS</h3>
        <p className="mb-2">
          Ao LOCATÁRIO fica recomendado fazer seguro contra incêndios dos imóveis locados, em seguradora idônea e que 
          passe por prévia autorização do LOCADOR.
        </p>

        <p className="mt-2"><strong>PARÁGRAFO ÚNICO:</strong> Qualquer acidente que porventura venha ocorrer no imóvel por culpa ou dolo do LOCATÁRIO, o mesmo ficará obrigado a pagar, além da multa prevista no PARÁGRAFO SEXTO da CLÁUSULA 3, todos as despesas por danos causados ao imóvel, devendo restitui-lo no estado cujo encontrou e que, sobretudo, teve conhecimento no auto de vistoria.</p>
      </section>

      {/* CLÁUSULA 9 – DA MULTA POR INFRAÇÃO */}
      <section className="contract-section mb-4">
        <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 9 – DA MULTA POR INFRAÇÃO</h3>
        <p className="mb-2">
          As partes estipulam o pagamento da multa no valor de 03 (três) aluguéis vigentes a época da ocorrência do fato, 
          a ser aplicado aquele que venha a infringir quaisquer das cláusulas contidas neste contrato exceto quando da 
          ocorrência das hipóteses previstas na CLÁUSULA 10.
        </p>

        <p className="mt-2"><strong>PARÁGRAFO ÚNICO:</strong> Caso venha o LOCATÁRIO a devolver o imóvel antes do término da vigência do contrato o mesmo pagará a título de multa o valor correspondente a 03 (três) aluguéis, vigentes na data da entrega das chaves, sem prejuízo dos dispostos no PARÁGRAFO SEXTO da CLÁUSULA 3 e PARÁGRAFO QUARTO da CLÁUSULA 4.</p>
      </section>

      {/* CLÁUSULA 10 – DA RESCISÃO CONTRATUAL */}
      <section className="contract-section mb-4">
        <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 10 – DA RESCISÃO CONTRATUAL</h3>
        <p>
          Ocorrerá a rescisão do presente contrato, independentemente de qualquer comunicação prévia ou indenização por parte 
          do LOCADOR, quando:
        </p>
        <p className="mt-2 ml-4"><strong>a)</strong> Ocorrendo qualquer sinistro, incêndio ou algo que venha impossibilitar a posse do imóvel, independente de dolo ou culpa do LOCATÁRIO: bem como quaisquer outras hipóteses que maculem os imóveis de vício e impossibilite sua posse;</p>
        <p className="ml-4"><strong>b)</strong> Em hipótese de desapropriação do imóvel alugado.</p>
      </section>

      {/* CLÁUSULA 11 – FIANÇA */}
      {fiador1Nome && (
        <section className="contract-section mb-4">
          <h3 className="mb-2 text-[12pt] font-bold uppercase">CLÁUSULA 11 – FIANÇA</h3>
          <p className="mb-2">
            Concordam com os termos fixados no presente contrato a Fiadora, já qualificada acima, e que se configura também 
            como principal pagadora, responsabilizando-se pelo fiel cumprimento do presente sem exceção de quaisquer cláusulas, 
            mesmo que o presente contrato passe a vigorar por tempo indeterminado.
          </p>
          <p className="mt-2 mb-1"><strong>PARÁGRAFO PRIMEIRO DA RENÚNCIA:</strong> A fiadora renuncia expressamente os benefícios contidos nos artigos 1.491, 1.499, 1.500, 1.502 e 1.503 do Código Civil Brasileiro.</p>
          <p className="mt-2"><strong>PARÁGRAFO SEGUNDO:</strong> A fiadora não se eximirá de responsabilidade solidária, caso o contrato venha a ultrapassar seu prazo de vigência, tornando-se desta forma, contrato por prazo indeterminado.</p>
        </section>
      )}

      {/* DISPOSIÇÕES FINAIS */}
      <section className="contract-section mb-6">
        <h3 className="mb-2 text-[12pt] font-bold uppercase">DISPOSIÇÕES FINAIS</h3>
        <p className="mb-2">
          O presente contrato passa a vigorar entre as partes a partir da assinatura do mesmo, as quais elegem o foro da 
          cidade de Santa Luzia-PB, onde se situa o imóvel, para dirimirem quaisquer dúvidas provenientes da execução e 
          cumprimento do mesmo.
        </p>
        <p>
          Os herdeiros, sucessores ou cessionários das partes contratantes se obrigam desde já ao inteiro teor deste contrato.
        </p>
        <p className="mt-2">
          E, por estarem justas e convencionadas as partes e fiadora assinam o presente <strong>CONTRATO DE LOCAÇÃO COMERCIAL</strong>, 
          juntamente com duas testemunhas.
        </p>
      </section>

      <p className="mt-5 text-center font-semibold leading-relaxed">
        Santa Luzia-PB, {dataAssinaturaExtenso}.
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
            <div className="mt-1 text-[10pt] font-normal normal-case text-black/70">Locatário(a)</div>
          </div>
        </div>

        {fiador1Nome && (
          <div className="signature-block mx-auto min-h-[72px]">
            <div className="border-t border-black pt-3 text-center font-bold uppercase">
              {fiador1Nome}
              <div className="mt-1 text-[10pt] font-normal normal-case text-black/70">Fiador(a)</div>
            </div>
          </div>
        )}

        {fiador2Nome && (
          <div className="signature-block mx-auto min-h-[72px]">
            <div className="border-t border-black pt-3 text-center font-bold uppercase">
              {fiador2Nome}
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
  );
}