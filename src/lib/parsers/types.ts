import type { FindingSource, ScanType, Severity } from "@prisma/client";

/** Normalized finding produced by every parser before it hits the database. */
export interface ParsedFinding {
  source: FindingSource;
  /** Stable identity for de-dup: STIG rule id or ACAS plugin id. */
  ruleId: string;
  groupId?: string; // V-xxxxx
  stigId?: string; // e.g. RHEL-08-010010
  pluginId?: string; // ACAS
  cve?: string;
  title: string;
  description?: string;
  severity: Severity;
  status: "OPEN" | "NOT_A_FINDING" | "NOT_APPLICABLE" | "NOT_REVIEWED" | "CLOSED";
  checkText?: string;
  fixText?: string;
  comments?: string;
  /** CCI ids referenced by the rule, e.g. ["CCI-000366"]. */
  ccis: string[];
}

/** Per-asset grouping of findings, since one scan covers many hosts. */
export interface ParsedAsset {
  hostname: string;
  fqdn?: string;
  ipAddress?: string;
  macAddress?: string;
  osName?: string;
  findings: ParsedFinding[];
}

export interface ParseResult {
  scanType: ScanType;
  benchmark?: string; // STIG benchmark title / scan policy name
  assets: ParsedAsset[];
}
