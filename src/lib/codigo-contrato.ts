/**
 * Utilitários compartilhados de código de contrato e vigência contratual.
 * Usados por páginas server-side e componentes client-side.
 */

type ContratoLike = {
  id?: string;
  codigo?: string | null;
  codigo_contrato?: string | null;
  clausulas_especiais?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  periodicidade_reajuste_meses?: number | null;
};

/**
 * Extrai o código de exibição de um contrato.
 * Prioridade: padrão legado "REN001-xxx" nas cláusulas especiais → codigo →
 * codigo_contrato → 8 primeiros caracteres do id.
 */
export function extrairCodigoExibicao(contrato: ContratoLike | null | undefined): string {
  if (!contrato) return "—";

  const padraoLegacy = /REN001-[A-Za-z0-9]+/.exec(String(contrato.clausulas_especiais || ""));
  if (padraoLegacy) return padraoLegacy[0];

  if (contrato.codigo) return String(contrato.codigo);
  if (contrato.codigo_contrato) return String(contrato.codigo_contrato);
  if (contrato.id) return String(contrato.id).slice(0, 8);

  return "—";
}

/**
 * Interpreta uma data "YYYY-MM-DD" como horário local (meia-noite).
 * Sem isso, o JS interpreta como UTC e, no Brasil (UTC-3), exibiria o dia anterior.
 */
function dataLocal(dataRaw: string): Date {
  const soData = /^(\d{4}-\d{2}-\d{2})/.exec(dataRaw);
  return new Date(soData ? `${soData[1]}T00:00:00` : dataRaw);
}

/**
 * Calcula a data final contratual de um contrato.
 * - Se data_fim está preenchida, usa-a.
 * - Caso contrário, assume a vigência padrão: início + periodicidade de
 *   reajuste (padrão 12 meses) menos 1 dia (véspera do "aniversário").
 *   Ex.: início 08/05/2026 + 12 meses − 1 dia = 07/05/2027.
 * Retorna "YYYY-MM-DD" ou null quando não há data de início válida.
 */
export function calcularDataFimContratual(contrato: ContratoLike | null | undefined): string | null {
  if (!contrato) return null;

  const fimRaw = String(contrato.data_fim || "").slice(0, 10);
  if (fimRaw) return fimRaw;

  const inicioRaw = String(contrato.data_inicio || "").slice(0, 10);
  if (!inicioRaw) return null;

  const inicio = dataLocal(inicioRaw);
  if (isNaN(inicio.getTime())) return null;

  const meses = Math.max(1, Number(contrato.periodicidade_reajuste_meses || 12));
  const fim = new Date(inicio.getFullYear(), inicio.getMonth() + meses, inicio.getDate() - 1);

  return `${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, "0")}-${String(fim.getDate()).padStart(2, "0")}`;
}
