/**
 * Conversão de valores monetários (BRL) para extenso.
 * Compartilhada entre contratos e recibos impressos.
 *
 * Exemplos:
 *   numeroParaExtenso(1)       → "UM REAL"
 *   numeroParaExtenso(1500)   → "MIL E QUINHENTOS REAIS"
 *   numeroParaExtenso(1234.5) → "MIL DUZENTOS E TRINTA E QUATRO REAIS E CINQUENTA CENTAVOS"
 */

const UNIDADES = [
  "", "UM", "DOIS", "TRÊS", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE",
  "DEZ", "ONZE", "DOZE", "TREZE", "CATORZE", "QUINZE", "DEZESSEIS", "DEZESSETE", "DEZOITO", "DEZENOVE",
];

const DEZENAS = [
  "", "", "VINTE", "TRINTA", "QUARENTA", "CINQUENTA", "SESSENTA", "SETENTA", "OITENTA", "NOVENTA",
];

const CENTENAS = [
  "", "CENTO", "DUZENTOS", "TREZENTOS", "QUATROCENTOS", "QUINHENTOS", "SEISCENTOS", "SETECENTOS", "OITOCENTOS", "NOVECENTOS",
];

/** Converte um número entre 1 e 999 para extenso. */
function grupoParaExtenso(num: number): string {
  if (num <= 0 || num >= 1000) return "";
  if (num === 100) return "CEM";
  if (num < 20) return UNIDADES[num];
  if (num < 100) {
    const d = Math.floor(num / 10);
    const u = num % 10;
    return DEZENAS[d] + (u > 0 ? ` E ${UNIDADES[u]}` : "");
  }
  const c = Math.floor(num / 100);
  const resto = num % 100;
  return CENTENAS[c] + (resto > 0 ? ` E ${grupoParaExtenso(resto)}` : "");
}

/** Converte um número inteiro entre 1 e 999.999.999 para extenso. */
function inteiroParaExtenso(num: number): string {
  if (num <= 0) return "";
  if (num < 1000) return grupoParaExtenso(num);

  if (num < 1_000_000) {
    const milhares = Math.floor(num / 1000);
    const resto = num % 1000;
    const parteMil = milhares === 1 ? "MIL" : `${grupoParaExtenso(milhares)} MIL`;
    if (resto === 0) return parteMil;
    // "MIL E CEM", "MIL E CINQUENTA", "MIL E QUINHENTOS" — mas "MIL DUZENTOS E TRINTA".
    const conector = resto < 100 || resto % 100 === 0 ? " E " : " ";
    return `${parteMil}${conector}${grupoParaExtenso(resto)}`;
  }

  const milhoes = Math.floor(num / 1_000_000);
  const resto = num % 1_000_000;
  const parteMilhoes = milhoes === 1 ? "UM MILHÃO" : `${grupoParaExtenso(milhoes)} MILHÕES`;
  if (resto === 0) return parteMilhoes;
  const conector = resto < 100 || resto % 100 === 0 || resto % 1000 === 0 ? " E " : " ";
  return `${parteMilhoes}${conector}${inteiroParaExtenso(resto)}`;
}

/** Converte um valor em reais para extenso (ex.: 1500 → "MIL E QUINHENTOS REAIS"). */
export function numeroParaExtenso(valor: number): string {
  if (!Number.isFinite(valor) || valor <= 0) return "ZERO REAIS";

  let parteInteira = Math.floor(valor);
  let centavos = Math.round((valor - parteInteira) * 100);
  if (centavos === 100) {
    parteInteira += 1;
    centavos = 0;
  }

  let resultado = "";
  if (parteInteira === 1) {
    resultado = "UM REAL";
  } else if (parteInteira > 0) {
    resultado = `${inteiroParaExtenso(parteInteira)} REAIS`;
  }

  if (centavos > 0) {
    resultado += (resultado ? " E " : "") + `${inteiroParaExtenso(centavos)} ${centavos === 1 ? "CENTAVO" : "CENTAVOS"}`;
  }

  return resultado;
}
