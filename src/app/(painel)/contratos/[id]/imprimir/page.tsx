import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import "./print.css";

export const dynamic = "force-dynamic";

function PrintContractButton() {
  return (
    <button
      type="button"
      onClick={() => typeof window !== "undefined" && window.print()}
      className="flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:opacity-95 cursor-pointer no-print"
      style={{ backgroundColor: "#0f766e" }}
    >
      Imprimir Contrato
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
    
    return dia + " de " + mes + " de " + ano;
  } catch {
    return "data de assinatura";
  }
}

function numeroParaExtenso(valor: number): string {
  if (isNaN(valor) || valor <= 0) return "ZERO REAIS";
  
  const unidades = ["", "UM", "DOIS", "TRES", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE", "DEZ", "ONZE", "DOZE", "TREZE", "CATORZE", "QUINZE", "DEZESSEIS", "DEZESSETE", "DEZOITO", "DEZENOVE"];
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
    (imovel.cidade || "Santa Luzia") + " - " + (imovel.uf || imovel.estado || "PB"),
    imovel.cep ? "CEP " + imovel.cep : null,
  ].filter(Boolean).join(", ");

  const dataInicioExtenso = formatarDataPorExtenso(contrato.data_inicio);
  const dataFimExtenso = formatarDataPorExtenso(contrato.data_fim);
  const dataAssinaturaExtenso = formatarDataPorExtenso(contrato.data_inicio || new Date().toISOString().split("T")[0]);

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      
      <div className="mb-6 no-print">
        <PrintContractButton />
      </div>

      <div className="print-container bg-white font-serif text-black text-justify leading-relaxed text-sm">
        
        <header className="abnt-header no-print">
          <div style={{ fontFamily: "'Times New Roman', serif" }}>
            <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
              IMOBILIARIA TORRES
            </p>
            <p style={{ fontSize: '9pt', margin: '4px 0 0 0', fontStyle: 'italic' }}>
              Contrato de Locacao Residencial
            </p>
          </div>
        </header>

        <div style={{ 
          fontFamily: "'Times New Roman', serif", 
          fontSize: '12pt', 
          lineHeight: '1.5', 
          textAlign: 'justify',
          color: '#000'
        }}>
          
          <h1 style={{ 
            textAlign: 'center', 
            fontWeight: 'bold', 
            fontSize: '14pt', 
            marginBottom: '24px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            CONTRATO DE LOCACAO RESIDENCIAL
          </h1>

          <div style={{ marginBottom: '24px', lineHeight: '1.5' }}>
            <p style={{ marginBottom: '8px' }}>
              <strong>LOCADOR:</strong> Paulo Sergio de Souza Torres, brasileiro, casado, empresario, portador do CPF n 930.952.604-15, residente na Rua Jose Bonifacio Nobrega, n 817, apartamento 103, Bairro Sao Jose, Santa Luzia - PB.
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>LOCATARIO:</strong> <span style={{ textTransform: 'uppercase' }}>{inquilino.nome || "—"}</span>, {inquilino.nacionalidade || "brasileira"}, {inquilino.estado_civil || "solteiro(a)"}, portador(a) do CPF n {inquilino.cpf || "—"}. Contato: {inquilino.telefone || "—"}.
            </p>
            <div>
              <strong>FIADORES:</strong>
              {contrato.fiador_1_nome ? (
                <ol style={{ marginTop: '8px', paddingLeft: '20px', lineHeight: '1.5' }}>
                  <li style={{ marginBottom: '8px' }}>
                    {contrato.fiador_1_nome}, {contrato.fiador_1_estado_civil || "—"}, {contrato.fiador_1_profissao || "—"}, residente na {contrato.fiador_1_endereco || "—"}, portador do CPF n {contrato.fiador_1_cpf || "—"}. Contato: {contrato.fiador_1_telefone || "—"}
                  </li>
                  {contrato.fiador_2_nome && (
                    <li style={{ marginTop: '8px' }}>
                      {contrato.fiador_2_nome}, {contrato.fiador_2_estado_civil || "—"}, {contrato.fiador_2_profissao || "—"}, residente na {contrato.fiador_2_endereco || "—"}, portador do CPF n {contrato.fiador_2_cpf || "—"}. Contato: {contrato.fiador_2_telefone || "—"}
                    </li>
                  )}
                </ol>
              ) : (
                <p style={{ marginTop: '8px', fontStyle: 'italic', color: '#666' }}>Nenhum fiador cadastrado neste contrato.</p>
              )}
            </div>
          </div>

          <p style={{ marginBottom: '16px', lineHeight: '1.5' }}>
            As partes acima identificadas celebram o presente <strong>CONTRATO DE LOCACAO RESIDENCIAL</strong>, que se regera pelas clausulas e condicoes seguintes.
          </p>

          <div style={{ lineHeight: '1.5' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLAUSULA 1 - DO IMOVEL</h3>
              <p style={{ marginBottom: '8px' }}>O imovel objeto deste contrato esta localizado na {enderecoImovel}.</p>
              <p style={{ marginTop: '8px' }}>O imovel e entregue na data da assinatura do contrato pelo locador ao locatario, que se obriga a devolve-lo com todos os utensilios e acessorios, tais como ar-condicionado com manutencao em dia, ventilador de teto com lampadas, portas, portoes, janelas e fechaduras em perfeitas condicoes de funcionamento, limpo e conservado, ainda que o contrato seja rescindido antecipadamente.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLAUSULA 2 - DO PRAZO</h3>
              <p>O prazo da locacao e de {contrato.periodicidade_reajuste_meses || 12} (DOZE) meses, com inicio em <strong>{dataInicioExtenso}</strong> e termino em <strong>{dataFimExtenso}</strong>.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLAUSULA 3 - DO VALOR E FORMA DE PAGAMENTO</h3>
              <p>O aluguel mensal e de <strong>R$ {valorAluguel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({numeroParaExtenso(valorAluguel)})</strong>, devendo ser pago via PIX para o Sr. Paulo Sergio de Souza Torres, de chave PIX formato CPF 930.952.604-15, Banco do Brasil.</p>
              <p style={{ marginTop: '8px' }}>O comprovante de pagamento devera ser enviado ao WhatsApp para o numero (83) 99350-2181. O pagamento deve ser efetuado ate o dia {contrato.dia_vencimento || 17} (DEZESSETE) de cada mes subsequente ao vencido.</p>
              <p style={{ marginTop: '8px' }}>O valor do aluguel sera reajustado anualmente conforme a variacao do IGPM, IGP, IPC ou {contrato.indice_reajuste || "IPCA"}. Na ausencia desses indices, sera aplicada a media da variacao inflacionaria anual vigente.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLAUSULA 4 - DAS DESPESAS E OBRIGACOES DO LOCATARIO</h3>
              <p>Todas as despesas diretamente ligadas a conservacao e uso do imovel, como agua, energia eletrica, telefone, IPTU, taxas e tributos, serao de responsabilidade exclusiva do locatario.</p>
              <p style={{ marginTop: '8px' }}>O locatario devera, em ate 5 (CINCO) dias da assinatura deste contrato, providenciar junto as concessionarias a transferencia das contas de agua, luz e internet para seu nome, sob pena de infraccao contratual. O locatario respondera por todas as contas durante a locacao, ainda que lancadas em nome de terceiros, bem como por eventuais indenizacoes decorrentes de danos morais ou materiais.</p>
              <p style={{ marginTop: '8px' }}>O nao pagamento do aluguel ate a data de vencimento acarretara multa de 10% (DEZ POR CENTO) sobre o valor devido, alem de juros de mora de 1% (UM POR CENTO) ao mes e correcao monetaria.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLAUSULA 5 - DO USO DO IMOVEL</h3>
              <p>O imovel destina-se exclusivamente para fins residenciais. E vedado ao locatario sublocar, ceder ou dar destinacao diversa ao imovel sem autorizacao expressa do locador. O imovel foi entregue em perfeito estado, com instalacoes eletricas e hidraulicas funcionando e pintura em boas condicoes.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLAUSULA 6 - DAS BENFEITORIAS</h3>
              <p>Qualquer benfeitoria ou modificacao devera ser previamente autorizada pelo locador. Caso o locatario realize melhorias sem autorizacao, o locador podera exigir o retorno do imovel ao estado original. As benfeitorias realizadas permanecerao integradas ao imovel, sem direito de indenizacao ou retencao.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLAUSULA 7 - DA DEVOLUCAO DO IMOVEL</h3>
              <p>Ao termino da locacao, o imovel devera ser devolvido nas mesmas condicoes em que foi recebido: limpo, pintado, com instalacoes eletricas, hidraulicas, ar-condicionado, ventiladores, portas, janelas, fechaduras e demais acessorios em perfeito estado de funcionamento.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLAUSULA 8 - DA PRORROGACAO</h3>
              <p>Caso o locatario permaneca no imovel apos o termino do prazo contratual, o contrato sera automaticamente prorrogado por tempo indeterminado, podendo o locador rescindi-lo mediante notificacao por escrito, com prazo de 30 (TRINTA) dias para desocupacao.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLAUSULA 9 - DO DIREITO DE PREFERENCIA E VISTORIAS</h3>
              <p>Se o locador desejar vender o imovel, devera oferecer preferencia ao locatario por escrito, que tera 30 (TRINTA) dias para manifestar interesse. O locador podera realizar vistorias periodicas, mediante aviso previo, para verificar o estado de conservacao do imovel.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLAUSULA 10 - DO SEGURO</h3>
              <p>Recomenda-se ao locatario contratar seguro contra incendio junto a seguradora idonea, para cobertura de eventuais danos ao imovel.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLAUSULA 11 - DAS PENALIDADES E MULTAS</h3>
              <p>O descumprimento de qualquer clausula contratual sujeitara a parte infratora ao pagamento de multa equivalente a 3 (TRES) meses de aluguel vigente, sem prejuizo de eventuais perdas e danos.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLAUSULA 12 - DA RESCISAO</h3>
              <p>O presente contrato podera ser rescindido em caso de sinistro, incendio, desapropriacao ou qualquer fato que impossibilite o uso do imovel. Em caso de rescissao antecipada por parte do locatario, este devera pagar multa equivalente a 3 (TRES) meses de aluguel vigente.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLAUSULA 13 - DOS FIADORES</h3>
              <p>Os fiadores acima qualificados obrigam-se como principais pagadores, renunciando aos beneficios previstos nos artigos 827 e 835 do Codigo Civil, permanecendo responsaveis ate a entrega definitiva das chaves.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLAUSULA 14 - DO FORO</h3>
              <p>Fica eleito o foro da cidade de Santa Luzia - PB para dirimir quaisquer controversias oriundas deste contrato.</p>
            </div>
          </div>

          <p style={{ marginTop: '24px', lineHeight: '1.5' }}>
            E por estarem assim justas e contratadas, assinam o presente contrato em 2 (DUAS) vias de igual teor e forma, juntamente com as testemunhas abaixo.
          </p>

          <p style={{ marginTop: '24px', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.5' }}>
            Santa Luzia - PB, {dataAssinaturaExtenso}.
          </p>

          <div style={{ marginTop: '48px', lineHeight: '1.5', fontSize: '11pt' }}>
            
            <div className="break-inside-avoid" style={{ marginBottom: '32px', textAlign: 'center', maxWidth: '160px', marginLeft: 'auto', marginRight: 'auto' }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: '8px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11pt' }}>
                PAULO SERGIO DE SOUZA TORRES<br />
                <span style={{ fontWeight: 'normal', fontSize: '10pt', color: '#333' }}>Locador</span>
              </div>
            </div>

            <div className="break-inside-avoid" style={{ marginBottom: '32px', textAlign: 'center', maxWidth: '160px', marginLeft: 'auto', marginRight: 'auto' }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: '8px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11pt' }}>
                {inquilino.nome || "—"}<br />
                <span style={{ fontWeight: 'normal', fontSize: '10pt', color: '#333' }}>Locatario(a)</span>
              </div>
            </div>

            {contrato.fiador_1_nome && (
              <div className="break-inside-avoid" style={{ marginBottom: '32px', textAlign: 'center', maxWidth: '160px', marginLeft: 'auto', marginRight: 'auto' }}>
                <div style={{ borderTop: '1px solid #000', paddingTop: '8px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11pt' }}>
                  {contrato.fiador_1_nome}<br />
                  <span style={{ fontWeight: 'normal', fontSize: '10pt', color: '#333' }}>Fiador(a) 1</span>
                </div>
              </div>
            )}

            {contrato.fiador_2_nome && (
              <div className="break-inside-avoid" style={{ marginBottom: '32px', textAlign: 'center', maxWidth: '160px', marginLeft: 'auto', marginRight: 'auto' }}>
                <div style={{ borderTop: '1px solid #000', paddingTop: '8px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11pt' }}>
                  {contrato.fiador_2_nome}<br />
                  <span style={{ fontWeight: 'normal', fontSize: '10pt', color: '#333' }}>Fiador(a) 2</span>
                </div>
              </div>
            )}

            <div className="break-inside-avoid" style={{ marginTop: '24px', maxWidth: '220px', marginLeft: 'auto', marginRight: 'auto' }}>
              <p style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '16px', fontSize: '11pt' }}>Testemunhas:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ borderTop: '1px solid #000', paddingTop: '8px' }}>
                  <p style={{ margin: 0 }}>Nome: __________________________________________________</p>
                  <p style={{ margin: '4px 0 0 0' }}>CPF: ___________________________________________________</p>
                </div>
                <div style={{ borderTop: '1px solid #000', paddingTop: '8px' }}>
                  <p style={{ margin: 0 }}>Nome: __________________________________________________</p>
                  <p style={{ margin: '4px 0 0 0' }}>CPF: ___________________________________________________</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        <footer className="abnt-footer no-print" style={{ marginTop: '40px' }}>
          <p style={{ margin: 0, fontSize: '9pt' }}>
            IMOBILIARIA TORRES - Sistema de Gestao de Alugueis | Santa Luzia - PB
          </p>
        </footer>

      </div>
    </div>
  );
}