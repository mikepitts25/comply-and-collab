import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseScan } from "@/lib/parsers";

const S = (name: string) => readFileSync(join(process.cwd(), "samples", name), "utf8");

describe("parseScan dispatch + ACAS (.nessus)", () => {
  const r = parseScan("acas-scan.nessus", S("acas-scan.nessus"));
  it("detects ACAS and both hosts", () => {
    expect(r.scanType).toBe("ACAS_NESSUS");
    expect(r.assets.map((a) => a.hostname).sort()).toEqual(["db01.demo.mil", "web01.demo.mil"]);
  });
  it("normalizes severity and captures CVE", () => {
    const web = r.assets.find((a) => a.hostname === "web01.demo.mil")!;
    const kernel = web.findings.find((f) => f.pluginId === "190123")!;
    expect(kernel.severity).toBe("CRITICAL");
    expect(kernel.cve).toBe("CVE-2024-12345");
    expect(kernel.source).toBe("ACAS");
  });
  it("skips informational (severity 0) items by default", () => {
    const total = r.assets.reduce((n, a) => n + a.findings.length, 0);
    expect(total).toBe(5);
  });
});

describe("STIG .ckl", () => {
  const r = parseScan("rhel8-web01.ckl", S("rhel8-web01.ckl"));
  it("parses rules with status, severity, CCIs", () => {
    expect(r.scanType).toBe("STIG_CKL");
    const f = r.assets[0].findings.find((x) => x.stigId === "RHEL-08-010120")!;
    expect(f.severity).toBe("MEDIUM");
    expect(f.status).toBe("OPEN");
    expect(f.ccis).toContain("CCI-000196");
  });
  it("maps NotAFinding status", () => {
    const nf = r.assets[0].findings.find((x) => x.stigId === "RHEL-08-010000")!;
    expect(nf.status).toBe("NOT_A_FINDING");
  });
});

describe("STIG .cklb (JSON)", () => {
  const r = parseScan("windows-app01.cklb", S("windows-app01.cklb"));
  it("parses high severity + CCIs", () => {
    expect(r.scanType).toBe("STIG_CKLB");
    const f = r.assets[0].findings.find((x) => x.groupId === "V-254238")!;
    expect(f.severity).toBe("HIGH");
    expect(f.status).toBe("NOT_A_FINDING");
  });
});

describe("SCAP / XCCDF", () => {
  const r = parseScan("scap-rhel8-web01-xccdf.xml", S("scap-rhel8-web01-xccdf.xml"));
  it("handles namespace prefixes and rule-result outcomes", () => {
    expect(r.scanType).toBe("SCAP");
    expect(r.assets[0].hostname).toBe("web01");
    const fail = r.assets[0].findings.find((f) => f.ruleId.includes("SV-230244"))!;
    expect(fail.status).toBe("OPEN");
    expect(fail.severity).toBe("HIGH");
    expect(fail.ccis).toContain("CCI-001453");
    const pass = r.assets[0].findings.find((f) => f.ruleId.includes("SV-230502"))!;
    expect(pass.status).toBe("NOT_A_FINDING");
  });
});

describe("unknown format", () => {
  it("throws a helpful error", () => {
    expect(() => parseScan("mystery.txt", "not a scan")).toThrow(/Unrecognized/);
  });
});
