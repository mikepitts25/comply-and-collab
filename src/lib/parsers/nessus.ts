import { XMLParser } from "fast-xml-parser";
import { asArray, severityFromNessus } from "./common";
import type { ParseResult, ParsedAsset, ParsedFinding } from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
});

/**
 * Parse an ACAS/Tenable `.nessus` (NessusClientData_v2) export into normalized
 * per-host findings. Informational (severity 0) items are skipped by default.
 */
export function parseNessus(xml: string, includeInfo = false): ParseResult {
  const doc = parser.parse(xml);
  const root = doc.NessusClientData_v2 ?? doc;
  const report = root.Report;
  const policyName = report?.["@_name"] ?? "ACAS Scan";

  const assets: ParsedAsset[] = [];

  for (const host of asArray<any>(report?.ReportHost)) {
    const props: Record<string, string> = {};
    for (const tag of asArray<any>(host?.HostProperties?.tag)) {
      const name = tag?.["@_name"];
      if (name) props[name] = tag?.["#text"] ?? "";
    }

    const hostname =
      props["host-fqdn"] || props["host-ip"] || host?.["@_name"] || "unknown-host";

    const findings: ParsedFinding[] = [];

    for (const item of asArray<any>(host?.ReportItem)) {
      const severityNum = item?.["@_severity"];
      if (!includeInfo && Number(severityNum) === 0) continue;

      const pluginId = String(item?.["@_pluginID"] ?? "");
      const pluginName = item?.["@_pluginName"] ?? "Unnamed plugin";
      const riskFactor = item?.risk_factor;

      const descriptionParts = [
        item?.synopsis ? `Synopsis: ${item.synopsis}` : null,
        item?.description ?? null,
        item?.plugin_output ? `\nPlugin output:\n${item.plugin_output}` : null,
      ].filter(Boolean);

      findings.push({
        source: "ACAS",
        ruleId: pluginId,
        pluginId,
        cve: item?.cve ? String(asArray(item.cve)[0]) : undefined,
        title: String(pluginName),
        description: descriptionParts.join("\n") || undefined,
        severity: severityFromNessus(riskFactor, severityNum),
        status: "OPEN",
        fixText: item?.solution ? String(item.solution) : undefined,
        // ACAS plugins rarely carry CCIs; correlation falls back to plugin map.
        ccis: [],
      });
    }

    assets.push({
      hostname,
      fqdn: props["host-fqdn"] || undefined,
      ipAddress: props["host-ip"] || undefined,
      macAddress: props["mac-address"]?.split(/\s+/)[0] || undefined,
      osName: props["operating-system"] || undefined,
      findings,
    });
  }

  return { scanType: "ACAS_NESSUS", benchmark: String(policyName), assets };
}
