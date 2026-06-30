import { parseNessus } from "./nessus";
import { parseCkl } from "./ckl";
import { parseCklb } from "./cklb";
import { parseScap } from "./scap";
import type { ParseResult } from "./types";

export * from "./types";

/**
 * Detect the scan format from filename + content and dispatch to the right
 * parser. Throws if the format can't be recognized.
 */
export function parseScan(filename: string, content: string): ParseResult {
  const lower = filename.toLowerCase();
  const trimmed = content.trimStart();

  if (lower.endsWith(".cklb") || trimmed.startsWith("{")) {
    return parseCklb(content);
  }
  if (lower.endsWith(".ckl") || trimmed.includes("<CHECKLIST")) {
    return parseCkl(content);
  }
  if (
    lower.endsWith(".nessus") ||
    trimmed.includes("<NessusClientData_v2") ||
    trimmed.includes("<NessusClientData")
  ) {
    return parseNessus(content);
  }
  // SCAP results: XCCDF (SCC / OpenSCAP) or ARF-wrapped. Match with or without
  // a namespace prefix (e.g. <cdf:TestResult>, <xccdf:Benchmark>).
  if (
    /<(\w+:)?(TestResult|asset-report-collection)\b/.test(trimmed) ||
    /<(\w+:)?Benchmark\b/.test(trimmed)
  ) {
    return parseScap(content);
  }
  throw new Error(
    `Unrecognized scan format for "${filename}". Supported: .nessus (ACAS), .ckl/.cklb (STIG), .xml (SCAP/XCCDF).`
  );
}
