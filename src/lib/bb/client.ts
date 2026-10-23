/**
 * Cliente da API de Boletos do Banco do Brasil (Cobrança, recurso v4).
 *
 * IMPORTANTE: endpoints, escopos e nomes de campo seguem a documentação
 * pública da API de Cobranças do BB. Se algo mudar (ou no primeiro teste
 * com credenciais reais), ajuste apenas as constantes abaixo.
 */

const URLS = {
  sandbox: {
    token: "https://oauth.hm.bb.com.br/oauth/token",
    api: "https://api.hm.bb.com.br",
  },
  producao: {
    token: "https://oauth.bb.com.br/oauth/token",
    api: "https://api.bb.com.br",
  },
} as const;

/** Escopo OAuth exigido pela API de boletos (registro + consulta). */
const OAUTH_SCOPE = "boletos-registro-read boletos-registro-write";

/** Código do tipo de título (2 = duplicata mercantil — usual para aluguéis). */
const CODIGO_TIPO_TITULO = 2;
const CODIGO_ACEITE = "A";

export type BBAmbiente = "sandbox" | "producao";

export type BBConfig = {
  clientId: string;
  clientSecret: string;
  convenio: string; // Nº do convênio de cobrança (7 dígitos)
  carteira: string; // Ex.: 17
  variacao: string; // Ex.: 019
  modalidade: string; // Ex.: 1 (simples)
  ambiente: BBAmbiente;
};

export type BBBoletoRegistrado = {
  numero: string; // ID do boleto no BB
  dataRegistro: string | null;
  linhaDigitavel: string | null;
  codigoBarraNumerico: string | null;
  pdfUrl: string | null;
};

export type BBBoletoConsultado = {
  numero: string;
  numeroTituloCliente: string | null;
  situacaoTitulo: string | null;
  dataRecebimento: string | null; // "DD.MM.YYYY"
  valorRecebido: number | null;
  valorOriginal: number | null;
  dataVencimento: string | null; // "DD.MM.YYYY"
};

export class BBError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BBError";
  }
}

/** Converte "YYYY-MM-DD" para "DD.MM.YYYY" (formato exigido pela API do BB). */
export function formatarDataBB(dataISO: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dataISO).trim());
  if (!m) throw new BBError(`Data inválida para a API do BB: "${dataISO}"`);
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** Converte "DD.MM.YYYY" (resposta do BB) para "YYYY-MM-DD". */
export function converterDataBB(dataBB: string | null | undefined): string | null {
  if (!dataBB) return null;
  const m = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(String(dataBB).trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

// ---------------------------------------------------------------------------
// OAuth2 (client_credentials) com cache em memória do token
// ---------------------------------------------------------------------------

let tokenCache: { token: string; expiraEm: number } | null = null;

export async function obterTokenBB(config: BBConfig): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiraEm) return tokenCache.token;

  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const res = await fetch(URLS[config.ambiente].token, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: OAUTH_SCOPE }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  const corpo = await res.json().catch(() => null);

  if (!res.ok) {
    const detalhe = corpo?.error_description || corpo?.error || `HTTP ${res.status}`;
    throw new BBError(`Falha na autenticação com o BB: ${detalhe}`);
  }
  if (!corpo?.access_token) throw new BBError("Resposta do BB sem access_token.");

  // Renova 60s antes de expirar para evitar falha na borda da validade.
  const expiraEm = Date.now() + (Number(corpo.expires_in || 300) - 60) * 1000;
  tokenCache = { token: corpo.access_token, expiraEm };
  return corpo.access_token as string;
}

/** Invalida o token em cache (ex.: credenciais alteradas ou 401 inesperado). */
export function invalidarTokenBB(): void {
  tokenCache = null;
}

// ---------------------------------------------------------------------------
// Registro de boleto
// ---------------------------------------------------------------------------

export async function registrarBoletoBB(
  config: BBConfig,
  dados: {
    dataEmissao: string; // YYYY-MM-DD
    dataVencimento: string; // YYYY-MM-DD
    valorOriginal: number;
    numeroTituloCliente: string; // 20 dígitos: convênio (7) + nosso número (13)
    pagador: {
      tipoInscricao: 1 | 2; // 1 = CPF, 2 = CNPJ
      numeroInscricao: string; // apenas dígitos
      nome: string;
      endereco: string;
      cep: string;
      cidade: string;
      bairro: string;
      uf: string;
    };
  }
): Promise<BBBoletoRegistrado> {
  const token = await obterTokenBB(config);

  const corpo = {
    numeroConvenio: config.convenio,
    numeroCarteira: config.carteira,
    numeroVariacaoCarteira: config.variacao,
    codigoModalidade: config.modalidade,
    dataEmissao: formatarDataBB(dados.dataEmissao),
    dataVencimento: formatarDataBB(dados.dataVencimento),
    valorOriginal: Number(dados.valorOriginal.toFixed(2)),
    numeroTituloCliente: dados.numeroTituloCliente,
    pagador: dados.pagador,
    codigoAceite: CODIGO_ACEITE,
    codigoTipoTitulo: CODIGO_TIPO_TITULO,
    indicadorPermissaoRecebimentoPartial: false,
    quantidadeParcelas: 1,
  };

  const res = await fetch(
    `${URLS[config.ambiente].api}/boletos/v4/boletos?gw-dev-app-key=${encodeURIComponent(config.clientId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(corpo),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    }
  );

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const erro = json?.erro;
    const detalhe =
      erro?.mensagens?.[0]?.mensagem || erro?.mensagem || json?.message || `HTTP ${res.status}`;
    throw new BBError(`BB recusou o registro do boleto: ${detalhe}`);
  }

  const links: Array<{ href?: string; rel?: string }> = Array.isArray(json?.links) ? json.links : [];
  const linkBoleto = links.find((l) => String(l.rel || "").toLowerCase().includes("boleto")) || links[0];

  return {
    numero: String(json?.numero ?? ""),
    dataRegistro: json?.dataRegistro ?? null,
    linhaDigitavel: json?.linhaDigitavel ?? null,
    codigoBarraNumerico: json?.codigoBarraNumerico ?? null,
    pdfUrl: linkBoleto?.href ?? null,
  };
}

// ---------------------------------------------------------------------------
// Consulta de boletos (usada pela baixa automática)
// ---------------------------------------------------------------------------

export async function listarBoletosBB(
  config: BBConfig,
  filtro: {
    indicadorSituacao: "T" | "P" | "B"; // Todos / Pagos / Baixados
    dataVencimentoInicial: string; // YYYY-MM-DD
    dataVencimentoFinal: string; // YYYY-MM-DD
  }
): Promise<BBBoletoConsultado[]> {
  const token = await obterTokenBB(config);
  const boletos: BBBoletoConsultado[] = [];
  let indice = 0;

  // A API pagina a lista; "indicadorContinuidade" sinaliza que há mais páginas.
  for (let pagina = 0; pagina < 50; pagina++) {
    const query = new URLSearchParams({
      numeroConvenio: config.convenio,
      indicadorSituacao: filtro.indicadorSituacao,
      dataVencimentoInicial: formatarDataBB(filtro.dataVencimentoInicial),
      dataVencimentoFinal: formatarDataBB(filtro.dataVencimentoFinal),
      indice: String(indice),
      "gw-dev-app-key": config.clientId,
    });

    const res = await fetch(`${URLS[config.ambiente].api}/boletos/v4/boletos?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const erro = json?.erro;
      const detalhe =
        erro?.mensagens?.[0]?.mensagem || erro?.mensagem || json?.message || `HTTP ${res.status}`;
      throw new BBError(`Falha ao consultar boletos no BB: ${detalhe}`);
    }

    const lista = Array.isArray(json?.listaBoletos) ? json.listaBoletos : [];
    for (const b of lista) {
      boletos.push({
        numero: String(b?.numero ?? ""),
        numeroTituloCliente: b?.numeroTituloCliente ?? null,
        situacaoTitulo: b?.situacaoTitulo ?? null,
        dataRecebimento: b?.dataRecebimento ?? null,
        valorRecebido: b?.valorRecebido != null ? Number(b.valorRecebido) : null,
        valorOriginal: b?.valorOriginal != null ? Number(b.valorOriginal) : null,
        dataVencimento: b?.dataVencimento ?? null,
      });
    }

    if (!json?.indicadorContinuidade) break;
    indice += 1;
  }

  return boletos;
}

// ---------------------------------------------------------------------------
// Download do PDF do boleto (o link do BB exige Bearer — por isso o proxy)
// ---------------------------------------------------------------------------

export async function baixarPdfBoletoBB(config: BBConfig, pdfUrl: string): Promise<ArrayBuffer> {
  const token = await obterTokenBB(config);
  const res = await fetch(pdfUrl, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new BBError(`Falha ao baixar o PDF do boleto (HTTP ${res.status}).`);
  return res.arrayBuffer();
}
