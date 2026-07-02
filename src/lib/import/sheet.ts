// Shared spreadsheet ingestion: turn a CSV or XLSX upload into rows of
// strings, plus tolerant header matching so teams' existing workbooks import
// without retyping (headers are matched case/punctuation-insensitively).

import ExcelJS from "exceljs";

/** RFC 4180 CSV parser (quotes, escaped quotes, CRLF, embedded newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, ""); // strip BOM

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  // Drop fully-empty trailing rows.
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** First worksheet of an .xlsx as rows of cell text. */
export async function parseXlsx(buffer: Uint8Array): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(buffer) as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    // row.values is 1-indexed; cell.text renders dates/formulas as displayed.
    for (let c = 1; c <= row.cellCount; c++) cells.push(row.getCell(c).text ?? "");
    rows.push(cells);
  });
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Dispatch by filename/content. */
export async function parseSheet(filename: string, bytes: Uint8Array): Promise<string[][]> {
  if (filename.toLowerCase().endsWith(".xlsx")) return parseXlsx(bytes);
  return parseCsv(new TextDecoder("utf-8").decode(bytes));
}

/** Normalize a header for matching: lowercase, alphanumerics only. */
export function normHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Map header aliases -> column index. Returns the index of the first matching
 * alias for each field, or -1 when absent.
 */
export function mapHeaders(
  headerRow: string[],
  fields: Record<string, string[]>
): Record<string, number> {
  const normed = headerRow.map(normHeader);
  const out: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(fields)) {
    out[field] = -1;
    for (const alias of aliases) {
      const idx = normed.indexOf(normHeader(alias));
      if (idx !== -1) {
        out[field] = idx;
        break;
      }
    }
  }
  return out;
}

/** Tolerant date parsing ("Jan 5, 2026", "2026-01-05", "1/5/2026"). */
export function parseSheetDate(v: string): Date | null {
  const s = v.trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
