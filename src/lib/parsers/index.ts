import { parseNessus } from "./nessus";
import { parseCkl } from "./ckl";
import { parseCklb } from "./cklb";
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
  throw new Error(
    `Unrecognized scan format for "${filename}". Supported: .nessus (ACAS), .ckl, .cklb (STIG).`
  );
}
