// eMASS-compatible POA&M CSV export (column order in poam-rows).
import { POAM_HEADERS, poamRow, type PoamForExport } from "./poam-rows";

export type { PoamForExport };

/** RFC 4180 CSV field escaping. */
function csv(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildPoamCsv(poams: PoamForExport[]): string {
  const lines = [POAM_HEADERS.map(csv).join(",")];
  for (const p of poams) lines.push(poamRow(p).map(csv).join(","));
  return lines.join("\r\n");
}
