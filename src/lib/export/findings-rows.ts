// Findings register export — flat row model shared by CSV (and future XLSX).
import type { Finding, System, Asset, FindingControl, User } from "@prisma/client";

export type FindingForExport = Finding & {
  system: Pick<System, "acronym" | "name">;
  asset: Pick<Asset, "hostname" | "ipAddress"> | null;
  controls: Pick<FindingControl, "controlId">[];
  assignee: Pick<User, "name"> | null;
};

export const FINDING_HEADERS = [
  "System",
  "Source",
  "Rule/Plugin ID",
  "STIG ID",
  "Group ID",
  "CVE",
  "Severity",
  "Status",
  "Title",
  "Asset",
  "Asset IP",
  "Mapped 800-53",
  "Assignee",
  "First Seen",
  "Last Seen",
] as const;

function iso(d: Date | null | undefined): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export function findingRow(f: FindingForExport): (string | number)[] {
  return [
    f.system.acronym,
    f.source,
    f.pluginId ?? f.ruleId,
    f.stigId ?? "",
    f.groupId ?? "",
    f.cve ?? "",
    f.severity,
    f.status,
    f.title,
    f.asset?.hostname ?? "",
    f.asset?.ipAddress ?? "",
    f.controls.map((c) => c.controlId).join(" "),
    f.assignee?.name ?? "",
    iso(f.firstSeen),
    iso(f.lastSeen),
  ];
}

/** RFC 4180 CSV field escaping. */
function csv(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildFindingsCsv(findings: FindingForExport[]): string {
  const lines = [FINDING_HEADERS.map(csv).join(",")];
  for (const f of findings) lines.push(findingRow(f).map(csv).join(","));
  return lines.join("\r\n");
}
