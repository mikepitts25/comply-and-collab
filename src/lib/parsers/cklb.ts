import { extractCcis, severityFromCat } from "./common";
import type { ParseResult, ParsedAsset, ParsedFinding } from "./types";
import type { ParsedFinding as PF } from "./types";

function mapStatus(raw: string | undefined): PF["status"] {
  switch ((raw ?? "").toLowerCase().trim()) {
    case "not_a_finding":
    case "notafinding":
      return "NOT_A_FINDING";
    case "not_applicable":
      return "NOT_APPLICABLE";
    case "open":
      return "OPEN";
    default:
      return "NOT_REVIEWED";
  }
}

/**
 * Parse a DISA STIG Viewer 3 `.cklb` (JSON) checklist into normalized findings.
 */
export function parseCklb(json: string): ParseResult {
  const doc = JSON.parse(json);
  const target = doc.target_data ?? {};
  const hostname =
    target.host_name || target.fqdn || target.ip_address || "unknown-host";

  const findings: ParsedFinding[] = [];
  let benchmark = doc.title || "STIG Checklist";

  for (const stig of (doc.stigs ?? []) as any[]) {
    if (stig?.display_name) benchmark = String(stig.display_name);
    for (const rule of (stig?.rules ?? []) as any[]) {
      const ruleId = rule?.rule_id || rule?.group_id;
      if (!ruleId) continue;
      findings.push({
        source: "STIG",
        ruleId: String(ruleId),
        groupId: rule?.group_id,
        stigId: rule?.rule_version || rule?.group_id_src,
        title: rule?.rule_title || "Untitled STIG rule",
        description: rule?.discussion,
        severity: severityFromCat(rule?.severity),
        status: mapStatus(rule?.status),
        checkText: rule?.check_content,
        fixText: rule?.fix_text,
        comments:
          [rule?.finding_details, rule?.comments].filter(Boolean).join("\n\n") ||
          undefined,
        ccis: extractCcis(rule?.ccis),
      });
    }
  }

  const parsedAsset: ParsedAsset = {
    hostname: String(hostname),
    fqdn: target.fqdn || undefined,
    ipAddress: target.ip_address || undefined,
    macAddress: target.mac_address || undefined,
    osName: target.comments || undefined,
    findings,
  };

  return { scanType: "STIG_CKLB", benchmark, assets: [parsedAsset] };
}
