// Removed "use client" to allow import in server components

// Imports moved inside functions to avoid server-side import of client-only libraries

interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  title: string;
  subtitle?: string;
  summary?: { label: string; value: string | number }[];
}

/**
 * Export data to CSV format
 */
export async function exportToCSV(data: ExportData, filename: string) {
  // Import client-only libraries lazily
  let saveAs: (blob: Blob, filename: string) => void;
  try {
    const fileSaverModule = await import("file-saver");
    saveAs = fileSaverModule.saveAs || fileSaverModule.default?.saveAs || fileSaverModule.default;
    if (!saveAs) throw new Error("saveAs not found in file-saver module");
  } catch (e) {
    console.error("Failed to load file-saver:", e);
    throw new Error("Não foi possível carregar a biblioteca de exportação. Tente novamente.");
  }
  const csvContent = [
    data.title,
    data.subtitle || "",
    "",
    data.headers.join(","),
    ...data.rows.map((row: (string | number)[]) => row.map((cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    "",
    "Resumo",
    ...(data.summary || []).map(s => `${s.label},${s.value}`)
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `${filename}.csv`);
}

/**
 * Export data to Excel format
 */
export async function exportToExcel(data: ExportData, filename: string) {
  // Import client-only libraries lazily
  let XLSX: any;
  try {
    const XLSXModule = await import("xlsx");
    XLSX = XLSXModule.default || XLSXModule;
    if (!XLSX?.utils?.book_new) throw new Error("XLSX utils not found");
  } catch (e) {
    console.error("Failed to load xlsx:", e);
    throw new Error("Não foi possível carregar a biblioteca de exportação Excel. Tente novamente.");
  }
  const wb = XLSX.utils.book_new();
  
  // Create worksheet with title and subtitle
  const wsData = [
    [data.title],
    [data.subtitle || ""],
    [] as (string | number)[],
    data.headers,
    ...data.rows,
    [] as (string | number)[],
    ["Resumo"],
    ...(data.summary || []).map(s => [s.label, s.value])
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  const colWidths = data.headers.map(() => ({ wch: 20 }));
  ws["!cols"] = colWidths;
  
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Generate PDF using browser print (fallback)
 */
export function printReport() {
  window.print();
}

/**
 * Format currency for export
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

/**
 * Format date for export
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Format competency for export
 */
export function formatCompetency(compStr: string | null | undefined): string {
  if (!compStr) return "";
  const comp = String(compStr).slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(comp)) return "";
  const [ano, mes] = comp.split("-");
  return `${mes}/${ano}`;
}