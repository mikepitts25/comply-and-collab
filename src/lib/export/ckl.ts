// STIG checklist exporter — regenerate DISA .ckl (XML) and .cklb (JSON)
// checklists from a system's current STIG findings, so triage done in
// Comply & Collab can round-trip back into STIG Viewer / eMASS.
//
// Round-trips through this app's own parsers (src/lib/parsers/{ckl,cklb}.ts):
// exporting then re-importing reproduces the same finding statuses.

import type { FindingStatus, Severity } from "@prisma/client";

export interface ExportAsset {
  hostname: string;
  fqdn?: string | null;
  ipAddress?: string | null;
  macAddress?: string | null;
}

export interface ExportFinding {
  ruleId: string;
  groupId?: string | null;
  stigId?: string | null;
  title: string;
  description?: string | null;
  severity: Severity;
  status: FindingStatus;
  checkText?: string | null;
  fixText?: string | null;
  comments?: string | null;
  ccis: { id: string }[];
}

function xmlEscape(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** FindingStatus -> DISA .ckl STATUS token. */
export function statusToCkl(s: FindingStatus): string {
  switch (s) {
    case "OPEN":
      return "Open";
    case "NOT_APPLICABLE":
      return "Not_Applicable";
    case "NOT_REVIEWED":
      return "Not_Reviewed";
    // A verified/closed finding is no longer a finding on the target.
    case "NOT_A_FINDING":
    case "CLOSED":
      return "NotAFinding";
    default:
      return "Not_Reviewed";
  }
}

/** FindingStatus -> .cklb (STIG Viewer 3) lowercase status. */
export function statusToCklb(s: FindingStatus): string {
  switch (s) {
    case "OPEN":
      return "open";
    case "NOT_APPLICABLE":
      return "not_applicable";
    case "NOT_REVIEWED":
      return "not_reviewed";
    case "NOT_A_FINDING":
    case "CLOSED":
      return "not_a_finding";
    default:
      return "not_reviewed";
  }
}

/** Normalized Severity -> STIG severity token. */
export function severityToStig(s: Severity): string {
  switch (s) {
    case "CRITICAL":
    case "HIGH":
      return "high";
    case "MEDIUM":
      return "medium";
    default:
      return "low";
  }
}

/**
 * Derive a benchmark grouping key + title from a STIG rule version id.
 * "RHEL-08-010010" -> "RHEL", "WN22-AC-000010" -> "WN22". Falls back to the
 * finding's group id family when the rule version is absent.
 */
export function deriveBenchmark(stigId?: string | null): { key: string; title: string } {
  const src = (stigId ?? "").trim();
  const m = src.match(/^([A-Za-z0-9]+)/);
  const key = m ? m[1].toUpperCase() : "STIG";
  return { key, title: `${key} STIG` };
}

/** Group findings by their derived benchmark, preserving first-seen order. */
function groupByBenchmark(findings: ExportFinding[]): Map<string, { title: string; items: ExportFinding[] }> {
  const groups = new Map<string, { title: string; items: ExportFinding[] }>();
  for (const f of findings) {
    const { key, title } = deriveBenchmark(f.stigId ?? f.groupId);
    const g = groups.get(key) ?? { title, items: [] };
    g.items.push(f);
    groups.set(key, g);
  }
  return groups;
}

function siData(name: string, data: string): string {
  return `        <SI_DATA><SID_NAME>${name}</SID_NAME><SID_DATA>${xmlEscape(data)}</SID_DATA></SI_DATA>`;
}

function stigData(attr: string, data: string): string {
  return `          <STIG_DATA><VULN_ATTRIBUTE>${attr}</VULN_ATTRIBUTE><ATTRIBUTE_DATA>${xmlEscape(
    data
  )}</ATTRIBUTE_DATA></STIG_DATA>`;
}

/** Build a DISA STIG Viewer 2.x compatible .ckl (XML) for one asset. */
export function buildCkl(asset: ExportAsset, findings: ExportFinding[]): string {
  const stigFindings = findings.filter((f) => f.stigId || f.groupId || f.ruleId.startsWith("SV-"));
  const groups = groupByBenchmark(stigFindings);

  const istigs: string[] = [];
  for (const [, g] of groups) {
    const vulns = g.items.map((f) => {
      const rows = [
        stigData("Vuln_Num", f.groupId ?? f.ruleId),
        stigData("Severity", severityToStig(f.severity)),
        stigData("Rule_ID", f.ruleId),
        stigData("Rule_Ver", f.stigId ?? ""),
        stigData("Rule_Title", f.title),
        stigData("Vuln_Discuss", f.description ?? ""),
        stigData("Check_Content", f.checkText ?? ""),
        stigData("Fix_Text", f.fixText ?? ""),
        ...f.ccis.map((c) => stigData("CCI_REF", c.id)),
      ].join("\n");
      return [
        `        <VULN>`,
        rows,
        `          <STATUS>${statusToCkl(f.status)}</STATUS>`,
        `          <FINDING_DETAILS>${xmlEscape(f.comments ?? "")}</FINDING_DETAILS>`,
        `          <COMMENTS></COMMENTS>`,
        `          <SEVERITY_OVERRIDE></SEVERITY_OVERRIDE>`,
        `          <SEVERITY_JUSTIFICATION></SEVERITY_JUSTIFICATION>`,
        `        </VULN>`,
      ].join("\n");
    });

    istigs.push(
      [
        `      <iSTIG>`,
        `        <STIG_INFO>`,
        siData("version", "1"),
        siData("title", g.title),
        siData("filename", `${g.title.replace(/\s+/g, "_")}.xml`),
        `        </STIG_INFO>`,
        vulns.join("\n"),
        `      </iSTIG>`,
      ].join("\n")
    );
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!--Comply & Collab :: STIG Checklist Export-->`,
    `<CHECKLIST>`,
    `  <ASSET>`,
    `    <ROLE>None</ROLE>`,
    `    <ASSET_TYPE>Computing</ASSET_TYPE>`,
    `    <HOST_NAME>${xmlEscape(asset.hostname)}</HOST_NAME>`,
    `    <HOST_IP>${xmlEscape(asset.ipAddress ?? "")}</HOST_IP>`,
    `    <HOST_MAC>${xmlEscape(asset.macAddress ?? "")}</HOST_MAC>`,
    `    <HOST_FQDN>${xmlEscape(asset.fqdn ?? "")}</HOST_FQDN>`,
    `    <TARGET_COMMENT></TARGET_COMMENT>`,
    `    <WEB_OR_DATABASE>false</WEB_OR_DATABASE>`,
    `    <WEB_DB_SITE></WEB_DB_SITE>`,
    `    <WEB_DB_INSTANCE></WEB_DB_INSTANCE>`,
    `  </ASSET>`,
    `  <STIGS>`,
    istigs.join("\n"),
    `  </STIGS>`,
    `</CHECKLIST>`,
  ].join("\n");
}

/** Build a DISA STIG Viewer 3 .cklb (JSON) for one asset. */
export function buildCklb(asset: ExportAsset, findings: ExportFinding[]): string {
  const stigFindings = findings.filter((f) => f.stigId || f.groupId || f.ruleId.startsWith("SV-"));
  const groups = groupByBenchmark(stigFindings);

  const stigs = [...groups.values()].map((g) => ({
    display_name: g.title,
    stig_name: g.title,
    version: "1",
    rules: g.items.map((f) => ({
      group_id: f.groupId ?? f.ruleId,
      rule_id: f.ruleId,
      rule_version: f.stigId ?? "",
      rule_title: f.title,
      severity: severityToStig(f.severity),
      discussion: f.description ?? "",
      check_content: f.checkText ?? "",
      fix_text: f.fixText ?? "",
      status: statusToCklb(f.status),
      finding_details: f.comments ?? "",
      comments: "",
      ccis: f.ccis.map((c) => c.id),
    })),
  }));

  return JSON.stringify(
    {
      title: `${asset.hostname} STIG Checklist`,
      cklb_version: "1.0",
      target_data: {
        host_name: asset.hostname,
        fqdn: asset.fqdn ?? "",
        ip_address: asset.ipAddress ?? "",
        mac_address: asset.macAddress ?? "",
      },
      stigs,
    },
    null,
    2
  );
}
