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
  const fileSaverModule = await import("file-saver");
  const saveAs = fileSaverModule.saveAs || fileSaverModule.default?.saveAs;
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
  const XLSXModule = await import("xlsx");
  const XLSX = XLSXModule.default || XLSXModule;
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
export function formatCompetency(comp: string | null | undefined): string {
  if (!comp) return "";
  const [year, month] = comp.slice(0, 7).split("-");
  return `${month}/${year}`;
}