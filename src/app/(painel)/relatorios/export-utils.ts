/**
 * Utilitários de exportação de relatórios (CSV) e formatação compartilhada.
 */

export function formatCurrency(value: number | string | null | undefined): string {
  const numero = Number(value ?? 0);
  if (Number.isNaN(numero)) return "—";
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [ano, mes, dia] = value.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return "—";
  return `${dia}/${mes}/${ano}`;
}

export function formatCompetency(value: string | null | undefined): string {
  const comp = String(value || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(comp)) return "—";
  const [ano, mes] = comp.split("-");
  return `${mes}/${ano}`;
}

function csvEscape(valor: string): string {
  if (/[",;\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

interface ExportData {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  summary?: { label: string; value: string }[];
}

function montarConteudoCSV(data: ExportData): string {
  const linhas: string[] = [];

  linhas.push(csvEscape(data.title));
  if (data.subtitle) linhas.push(csvEscape(data.subtitle));
  linhas.push("");

  if (data.summary && data.summary.length > 0) {
    for (const item of data.summary) {
      linhas.push(`${csvEscape(item.label)}: ${csvEscape(item.value)}`);
    }
    linhas.push("");
  }

  linhas.push(data.headers.map(csvEscape).join(";"));
  for (const linha of data.rows) {
    linhas.push(linha.map((celula) => csvEscape(String(celula ?? ""))).join(";"));
  }

  // BOM UTF-8 para o Excel exibir acentos corretamente
  return "\uFEFF" + linhas.join("\r\n");
}

function baixarArquivo(conteudo: string, nomeArquivo: string, mimeType: string) {
  const blob = new Blob([conteudo], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToCSV(data: ExportData, nomeArquivo: string): Promise<void> {
  const csv = montarConteudoCSV(data);
  baixarArquivo(csv, `${nomeArquivo}.csv`, "text/csv;charset=utf-8;");
}

/**
 * Exporta planilha Excel compatível (CSV com separador ";" e BOM UTF-8,
 * aberto nativamente pelo Excel pt-BR).
 */
export async function exportToExcel(data: ExportData, nomeArquivo: string): Promise<void> {
  const csv = montarConteudoCSV(data);
  baixarArquivo(csv, `${nomeArquivo}.csv`, "application/vnd.ms-excel;charset=utf-8;");
}
