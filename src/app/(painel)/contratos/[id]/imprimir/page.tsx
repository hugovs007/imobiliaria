import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function PrintContractButton() {
  return (
    <button
      type="button"
      onClick={() => typeof window !== "undefined" && window.print()}
      className="flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:opacity-95 cursor-pointer no-print"
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

// Print styles as a string to be injected
const printStyles = `
  @media print {
    @page {
      size: A4;
      margin: 3cm 2cm 2cm 3cm;
      
      @top-center {
        content: "IMOBILIÁRIA TORRES - CONTRATO DE LOCAÇÃO RESIDENCIAL";
        font-family: 'Times New Roman', serif;
        font-size: 10pt;
        font-weight: bold;
        color: #000;
        border-bottom: 1px solid #000;
        padding-bottom: 4mm;
        margin-bottom: 6mm;
      }
      
      @bottom-center {
        content: "Página " counter(page) " de " counter(pages);
        font-family: 'Times New Roman', serif;
        font-size: 10pt;
        color: #000;
        border-top: 1px solid #000;
        padding-top: 4mm;
        margin-top: 6mm;
      }
      
      margin: 3cm 2cm 2cm 3cm;
    }
    
    body {
      background-color: white !important;
      margin: 0 !important;
      font-family: 'Times New Roman', serif !important;
    }
    
    .no-print {
      display: none !important;
    }
    
    .print-container {
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
    }
    
    .break-inside-avoid {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    
    h3 {
      break-after: avoid;
      page-break-after: avoid;
    }
  }
  
  @media screen {
    .print-container {
      border: 1px solid #d1d5db;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      padding: 40px;
      margin: 20px auto;
      max-width: 210mm;
      background: white;
    }
    
    .abnt-header {
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 24px;
      text-align: center;
    }
    
    .abnt-footer {
      border-top: 1px solid #000;
      padding-top: 8px;
      margin-top: 24px;
      text-align: center;
      font-size: 10pt;
      color: #666;
    }
  }
`;

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
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      
      <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
        
        {/* Botão de impressão (Oculto na impressão real) */}
        <div className="mb-6 no-print">
          <PrintContractButton />
        </div>

        {/* Documento do Contrato - Formato ABNT */}
        <div className="print-container bg-white font-serif text-black text-justify leading-relaxed text-sm">
          
          {/* CABEÇALHO ABNT */}
          <header className="abnt-header no-print">
            <div style={{ fontFamily: "'Times New Roman', serif" }}>
              <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                IMOBILIÁRIA TORRES
              </p>
              <p style={{ fontSize: '9pt', margin: '4px 0 0 0', fontStyle: 'italic' }}>
                Contrato de Locação Residencial
              </p>
            </div>
          </header>

          {/* CONTEÚDO DO CONTRATO */}
          <div style={{ 
            fontFamily: "'Times New Roman', serif", 
            fontSize: '12pt', 
            lineHeight: '1.5', /* ABNT: espaçamento 1.5 */
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
              CONTRATO DE LOCAÇÃO RESIDENCIAL
            </h1>

            <div style={{ marginBottom: '24px', lineHeight: '1.5' }}>
              <p style={{ marginBottom: '8px' }}>
                <strong>LOCADOR:</strong> Paulo Sérgio de Souza Torres, brasileiro, casado, empresário, portador do CPF nº 930.952.604-15, residente na Rua José Bonifácio Nóbrega, nº 817, apartamento 103, Bairro São José, Santa Luzia – PB.
              </p>
              <p style={{ marginBottom: '8px' }}>
                <strong>LOCATÁRIO:</strong> <span style={{ textTransform: 'uppercase' }}>{inquilino.nome || "—"}</span>, {inquilino.nacionalidade || "brasileira"}, {inquilino.estado_civil || "solteiro(a)"}, portador(a) do CPF nº {inquilino.cpf || "—"}. Contato: {inquilino.telefone || "—"}.
              </p>
              <div>
                <strong>FIADORES:</strong>
                {contrato.fiador_1_nome ? (
                  <ol style={{ marginTop: '8px', paddingLeft: '20px', lineHeight: '1.5' }}>
                    <li style={{ marginBottom: '8px' }}>
                      {contrato.fiador_1_nome}, {contrato.fiador_1_estado_civil || "—"}, {contrato.fiador_1_profissao || "—"}, residente na {contrato.fiador_1_endereco || "—"}, portador do CPF nº {contrato.fiador_1_cpf || "—"}. Contato: {contrato.fiador_1_telefone || "—"}
                    </li>
                    {contrato.fiador_2_nome && (
                      <li style={{ marginTop: '8px' }}>
                        {contrato.fiador_2_nome}, {contrato.fiador_2_estado_civil || "—"}, {contrato.fiador_2_profissao || "—"}, residente na {contrato.fiador_2_endereco || "—"}, portador do CPF nº {contrato.fiador_2_cpf || "—"}. Contato: {contrato.fiador_2_telefone || "—"}
                      </li>
                    )}
                  </ol>
                ) : (
                  <p style={{ marginTop: '8px', fontStyle: 'italic', color: '#666' }}>Nenhum fiador cadastrado neste contrato.</p>
                )}
              </div>
            </div>

            <p style={{ marginBottom: '16px', lineHeight: '1.5' }}>
              As partes acima identificadas celebram o presente <strong>CONTRATO DE LOCAÇÃO RESIDENCIAL</strong>, que se regerá pelas cláusulas e condições seguintes.
            </p>

            <div style={{ lineHeight: '1.5' }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLÁUSULA 1ª – DO IMÓVEL</h3>
                <p style={{ marginBottom: '8px' }}>O imóvel objeto deste contrato está localizado na {enderecoImovel}.</p>
                <p style={{ marginTop: '8px' }}>O imóvel é entregue na data da assinatura do contrato pelo locador ao locatário, que se obriga a devolvê-lo com todos os utensílios e acessórios, tais como ar-condicionado com manutenção em dia, ventilador de teto com lâmpadas, portas, portões, janelas e fechaduras em perfeitas condições de funcionamento, limpo e conservado, ainda que o contrato seja rescindido antecipadamente.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLÁUSULA 2ª – DO PRAZO</h3>
                <p>O prazo da locação é de {contrato.periodicidade_reajuste_meses || 12} (DOZE) meses, com início em <strong>{dataInicioExtenso}</strong> e término em <strong>{dataFimExtenso}</strong>.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLÁUSULA 3ª – DO VALOR E FORMA DE PAGAMENTO</h3>
                <p>O aluguel mensal é de <strong>R$ {valorAluguel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({numeroParaExtenso(valorAluguel)})</strong>, devendo ser pago via PIX para o Sr. Paulo Sérgio de Souza Torres, de chave PIX formato CPF 930.952.604-15, Banco do Brasil.</p>
                <p style={{ marginTop: '8px' }}>O comprovante de pagamento deverá ser enviado ao WhatsApp para o número (83) 99350-2181. O pagamento deve ser efetuado até o dia {contrato.dia_vencimento || 17} (DEZESSETE) de cada mês subsequente ao vencido.</p>
                <p style={{ marginTop: '8px' }}>O valor do aluguel será reajustado anualmente conforme a variação do IGPM, IGP, IPC ou {contrato.indice_reajuste || "IPCA"}. Na ausência desses índices, será aplicada a média da variação inflacionária anual vigente.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLÁUSULA 4ª – DAS DESPESAS E OBRIGAÇÕES DO LOCATÁRIO</h3>
                <p>Todas as despesas diretamente ligadas à conservação e uso do imóvel, como água, energia elétrica, telefone, IPTU, taxas e tributos, serão de responsabilidade exclusiva do locatário.</p>
                <p style={{ marginTop: '8px' }}>O locatário deverá, em até 5 (CINCO) dias da assinatura deste contrato, providenciar junto às concessionárias a transferência das contas de água, luz e internet para seu nome, sob pena de infração contratual. O locatário responderá por todas as contas durante a locação, ainda que lançadas em nome de terceiros, bem como por eventuais indenizações decorrentes de danos morais ou materiais.</p>
                <p style={{ marginTop: '8px' }}>O não pagamento do aluguel até a data de vencimento acarretará multa de 10% (DEZ POR CENTO) sobre o valor devido, além de juros de mora de 1% (UM POR CENTO) ao mês e correção monetária.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLÁUSULA 5ª – DO USO DO IMÓVEL</h3>
                <p>O imóvel destina-se exclusivamente para fins residenciais. É vedado ao locatário sublocar, ceder ou dar destinação diversa ao imóvel sem autorização expressa do locador. O imóvel foi entregue em perfeito estado, com instalações elétricas e hidráulicas funcionando e pintura em boas condições.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLÁUSULA 6ª – DAS BENFEITORIAS</h3>
                <p>Qualquer benfeitoria ou modificação deverá ser previamente autorizada pelo locador. Caso o locatário realize melhorias sem autorização, o locador poderá exigir o retorno do imóvel ao estado original. As benfeitorias realizadas permanecerão integradas ao imóvel, sem direito de indenização ou retenção.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLÁUSULA 7ª – DA DEVOLUÇÃO DO IMÓVEL</h3>
                <p>Ao término da locação, o imóvel deverá ser devolvido nas mesmas condições em que foi recebido: limpo, pintado, com instalações elétricas, hidráulicas, ar-condicionado, ventiladores, portas, janelas, fechaduras e demais acessórios em perfeito estado de funcionamento.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLÁUSULA 8ª – DA PRORROGAÇÃO</h3>
                <p>Caso o locatário permaneça no imóvel após o término do prazo contratual, o contrato será automaticamente prorrogado por tempo indeterminado, podendo o locador rescindi-lo mediante notificação por escrito, com prazo de 30 (TRINTA) dias para desocupação.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLÁUSULA 9ª – DO DIREITO DE PREFERÊNCIA E VISTORIAS</h3>
                <p>Se o locador desejar vender o imóvel, deverá oferecer preferência ao locatário por escrito, que terá 30 (TRINTA) dias para manifestar interesse. O locador poderá realizar vistorias periódicas, mediante aviso prévio, para verificar o estado de conservação do imóvel.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLÁUSULA 10ª – DO SEGURO</h3>
                <p>Recomenda-se ao locatário contratar seguro contra incêndio junto a seguradora idônea, para cobertura de eventuais danos ao imóvel.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLÁUSULA 11ª – DAS PENALIDADES E MULTAS</h3>
                <p>O descumprimento de qualquer cláusula contratual sujeitará a parte infratora ao pagamento de multa equivalente a 3 (TRÊS) meses de aluguel vigente, sem prejuízo de eventuais perdas e danos.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLÁUSULA 12ª – DA RESCISÃO</h3>
                <p>O presente contrato poderá ser rescindido em caso de sinistro, incêndio, desapropriação ou qualquer fato que impossibilite o uso do imóvel. Em caso de rescisão antecipada por parte do locatário, este deverá pagar multa equivalente a 3 (TRÊS) meses de aluguel vigente.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLÁUSULA 13ª – DOS FIADORES</h3>
                <p>Os fiadores acima qualificados obrigam-se como principais pagadores, renunciando aos benefícios previstos nos artigos 827 e 835 do Código Civil, permanecendo responsáveis até a entrega definitiva das chaves.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt', marginBottom: '8px' }}>CLÁUSULA 14ª – DO FORO</h3>
                <p>Fica eleito o foro da cidade de Santa Luzia – PB para dirimir quaisquer controvérsias oriundas deste contrato.</p>
              </div>
            </div>

            <p style={{ marginTop: '24px', lineHeight: '1.5' }}>
              E por estarem assim justas e contratadas, assinam o presente contrato em 2 (DUAS) vias de igual teor e forma, juntamente com as testemunhas abaixo.
            </p>

            <p style={{ marginTop: '24px', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.5' }}>
              Santa Luzia – PB, {dataAssinaturaExtenso}.
            </p>

            <div style={{ marginTop: '48px', lineHeight: '1.5', fontSize: '11pt' }}>
              
              <div className="break-inside-avoid" style={{ marginBottom: '32px', textAlign: 'center', maxWidth: '160px', marginLeft: 'auto', marginRight: 'auto' }}>
                <div style={{ borderTop: '1px solid #000', paddingTop: '8px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11pt' }}>
                  PAULO SÉRGIO DE SOUZA TORRES<br />
                  <span style={{ fontWeight: 'normal', fontSize: '10pt', color: '#333' }}>Locador</span>
                </div>
              </div>

              <div className="break-inside-avoid" style={{ marginBottom: '32px', textAlign: 'center', maxWidth: '160px', marginLeft: 'auto', marginRight: 'auto' }}>
                <div style={{ borderTop: '1px solid #000', paddingTop: '8px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11pt' }}>
                  {inquilino.nome || "—"}<br />
                  <span style={{ fontWeight: 'normal', fontSize: '10pt', color: '#333' }}>Locatário(a)</span>
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

          {/* RODAPÉ ABNT - Visível apenas na tela */}
          <footer className="abnt-footer no-print" style={{ marginTop: '40px' }}>
            <p style={{ margin: 0, fontSize: '9pt' }}>
              IMOBILIÁRIA TORRES - Sistema de Gestão de Aluguéis | Santa Luzia - PB
            </p>
          </footer>

        </div>
      </div>
    </>
  );
}