import type { Severity } from "@prisma/client";

/** STIG CAT level -> normalized severity. */
export function severityFromCat(raw: string | undefined): Severity {
  const v = (raw ?? "").toLowerCase().trim();
  if (v === "high" || v === "i" || v === "cat i" || v === "1") return "HIGH";
  if (v === "medium" || v === "ii" || v === "cat ii" || v === "2") return "MEDIUM";
  if (v === "low" || v === "iii" || v === "cat iii" || v === "3") return "LOW";
  return "MEDIUM";
}

/** Nessus risk_factor / severity number -> normalized severity. */
export function severityFromNessus(
  riskFactor: string | undefined,
  severityNum: string | number | undefined
): Severity {
  const rf = (riskFactor ?? "").toLowerCase();
  if (rf === "critical") return "CRITICAL";
  if (rf === "high") return "HIGH";
  if (rf === "medium") return "MEDIUM";
  if (rf === "low") return "LOW";
  if (rf === "none") return "INFO";
  // Fall back to numeric severity 0..4
  const n = Number(severityNum);
  if (n >= 4) return "CRITICAL";
  if (n === 3) return "HIGH";
  if (n === 2) return "MEDIUM";
  if (n === 1) return "LOW";
  return "INFO";
}

/** Pull CCI references (CCI-000000 form) out of arbitrary text/arrays. */
export function extractCcis(input: unknown): string[] {
  const out = new Set<string>();
  const visit = (val: unknown) => {
    if (val == null) return;
    if (Array.isArray(val)) return val.forEach(visit);
    const s = String(val);
    const matches = s.match(/CCI-\d{6}/gi);
    if (matches) matches.forEach((m) => out.add(m.toUpperCase()));
  };
  visit(input);
  return [...out];
}

/** Coerce fast-xml-parser single-or-array nodes into an array. */
export function asArray<T>(node: T | T[] | undefined | null): T[] {
  if (node == null) return [];
  return Array.isArray(node) ? node : [node];
}
