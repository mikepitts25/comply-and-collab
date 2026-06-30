import { XMLParser } from "fast-xml-parser";
import { asArray, extractCcis, severityFromCat } from "./common";
import type { ParseResult, ParsedAsset, ParsedFinding } from "./types";
import type { ParsedFinding as PF } from "./types";

const parser = new XMLParser({
  ignoreAttributes: true,
  textNodeName: "#text",
  trimValues: true,
});

function mapStatus(raw: string | undefined): PF["status"] {
  switch ((raw ?? "").trim()) {
    case "NotAFinding":
      return "NOT_A_FINDING";
    case "Not_Applicable":
      return "NOT_APPLICABLE";
    case "Open":
      return "OPEN";
    default:
      return "NOT_REVIEWED";
  }
}

/**
 * Parse a DISA STIG Viewer `.ckl` (XML CHECKLIST) into normalized findings.
 * One .ckl describes a single asset evaluated against one or more STIGs.
 */
export function parseCkl(xml: string): ParseResult {
  const doc = parser.parse(xml);
  const checklist = doc.CHECKLIST ?? doc;
  const asset = checklist.ASSET ?? {};

  const hostname =
    asset.HOST_NAME || asset.HOST_FQDN || asset.HOST_IP || "unknown-host";

  const findings: ParsedFinding[] = [];
  let benchmark = "STIG Checklist";

  for (const istig of asArray<any>(checklist.STIGS?.iSTIG)) {
    // STIG title lives in STIG_INFO/SI_DATA where SID_NAME == "title"
    for (const si of asArray<any>(istig?.STIG_INFO?.SI_DATA)) {
      if (si?.SID_NAME === "title" && si?.SID_DATA) benchmark = String(si.SID_DATA);
    }

    for (const vuln of asArray<any>(istig?.VULN)) {
      const attrs: Record<string, string[]> = {};
      for (const sd of asArray<any>(vuln?.STIG_DATA)) {
        const key = sd?.VULN_ATTRIBUTE;
        if (!key) continue;
        (attrs[key] ??= []).push(String(sd?.ATTRIBUTE_DATA ?? ""));
      }
      const first = (k: string) => attrs[k]?.[0];

      const ruleId = first("Rule_ID") || first("Vuln_Num") || "";
      if (!ruleId) continue;

      findings.push({
        source: "STIG",
        ruleId,
        groupId: first("Vuln_Num"),
        stigId: first("Rule_Ver"),
        title: first("Rule_Title") || "Untitled STIG rule",
        description: first("Vuln_Discuss"),
        severity: severityFromCat(first("Severity")),
        status: mapStatus(vuln?.STATUS),
        checkText: first("Check_Content"),
        fixText: first("Fix_Text"),
        comments:
          [vuln?.FINDING_DETAILS, vuln?.COMMENTS].filter(Boolean).join("\n\n") ||
          undefined,
        ccis: extractCcis(attrs["CCI_REF"]),
      });
    }
  }

  const parsedAsset: ParsedAsset = {
    hostname: String(hostname),
    fqdn: asset.HOST_FQDN || undefined,
    ipAddress: asset.HOST_IP || undefined,
    macAddress: asset.HOST_MAC || undefined,
    osName: asset.TARGET_COMMENT || undefined,
    findings,
  };

  return { scanType: "STIG_CKL", benchmark, assets: [parsedAsset] };
}
