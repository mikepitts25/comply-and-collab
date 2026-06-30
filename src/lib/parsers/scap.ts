import { XMLParser } from "fast-xml-parser";
import { asArray, extractCcis, severityFromCat } from "./common";
import type { ParseResult, ParsedAsset, ParsedFinding } from "./types";
import type { ParsedFinding as PF } from "./types";

// removeNSPrefix strips xccdf:/cdf:/arf: prefixes so tag access is uniform
// across SCC, OpenSCAP, and ARF-wrapped result files.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  textNodeName: "#text",
  trimValues: true,
});

/** XCCDF rule-result outcome -> normalized finding status. */
function mapResult(raw: string | undefined): PF["status"] {
  switch ((raw ?? "").toLowerCase().trim()) {
    case "fail":
      return "OPEN";
    case "pass":
    case "fixed":
      return "NOT_A_FINDING";
    case "notapplicable":
      return "NOT_APPLICABLE";
    default:
      // notchecked / notselected / informational / error / unknown
      return "NOT_REVIEWED";
  }
}

/** Collect every node under `root` whose key matches `key` (handles ARF nesting). */
function deepFind(root: unknown, key: string, out: any[] = []): any[] {
  if (root == null || typeof root !== "object") return out;
  for (const [k, v] of Object.entries(root as Record<string, unknown>)) {
    if (k === key) asArray<any>(v as any).forEach((n) => out.push(n));
    if (v && typeof v === "object") deepFind(v, key, out);
  }
  return out;
}

function pickText(node: any): string | undefined {
  if (node == null) return undefined;
  if (typeof node === "string") return node;
  if (typeof node === "object" && "#text" in node) return String(node["#text"]);
  return undefined;
}

/**
 * Parse a SCAP result file — XCCDF `TestResult` (SCC / OpenSCAP) or an
 * ARF-wrapped equivalent — into normalized per-host findings.
 */
export function parseScap(xml: string): ParseResult {
  const doc = parser.parse(xml);

  // Build a rule definition lookup from the Benchmark(s): id -> {title, severity, ccis}
  const ruleDefs = new Map<
    string,
    { title: string; severity: string; ccis: string[]; check?: string; fix?: string; discuss?: string }
  >();
  for (const rule of deepFind(doc, "Rule")) {
    const id = rule?.["@_id"];
    if (!id) continue;
    const idents = asArray<any>(rule?.ident);
    const cciVals = idents
      .filter((i) => String(i?.["@_system"] ?? "").toLowerCase().includes("cci"))
      .map((i) => pickText(i) ?? String(i));
    ruleDefs.set(String(id), {
      title: pickText(rule?.title) ?? String(rule?.title ?? "Untitled rule"),
      severity: String(rule?.["@_severity"] ?? "medium"),
      ccis: extractCcis(cciVals.length ? cciVals : idents.map((i) => pickText(i))),
      check:
        pickText(rule?.check?.["check-content"]) ??
        pickText(rule?.["check-content"]) ??
        undefined,
      fix: pickText(rule?.fixtext) ?? pickText(rule?.fix) ?? undefined,
      discuss: pickText(rule?.description) ?? undefined,
    });
  }

  const benchmark =
    pickText(deepFind(doc, "Benchmark")[0]?.title) ?? "SCAP Benchmark";

  const assets: ParsedAsset[] = [];

  for (const tr of deepFind(doc, "TestResult")) {
    const targets = asArray<any>(tr?.target).map((t) => pickText(t) ?? String(t));
    const addrs = asArray<any>(tr?.["target-address"]).map((t) => pickText(t) ?? String(t));
    const hostname = targets[0] || addrs[0] || "unknown-host";

    const findings: ParsedFinding[] = [];
    for (const rr of deepFind(tr, "rule-result")) {
      const ruleId = rr?.["@_idref"];
      if (!ruleId) continue;
      const def = ruleDefs.get(String(ruleId));
      const severityRaw = rr?.["@_severity"] ?? def?.severity;
      // rule-results may carry their own CCI idents too.
      const rrCcis = asArray<any>(rr?.ident)
        .map((i) => pickText(i) ?? String(i));

      findings.push({
        source: "SCAP",
        ruleId: String(ruleId),
        stigId: undefined,
        title: def?.title ?? String(ruleId),
        description: def?.discuss,
        severity: severityFromCat(severityRaw),
        status: mapResult(pickText(rr?.result) ?? rr?.result),
        checkText: def?.check,
        fixText: def?.fix,
        ccis: [...new Set([...(def?.ccis ?? []), ...extractCcis(rrCcis)])],
      });
    }

    assets.push({
      hostname: String(hostname),
      ipAddress: addrs.find((a) => /\d+\.\d+\.\d+\.\d+/.test(a)) || undefined,
      findings,
    });
  }

  return { scanType: "SCAP", benchmark, assets };
}
