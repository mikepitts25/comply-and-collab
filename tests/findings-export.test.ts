import { describe, it, expect } from "vitest";
import { buildFindingsCsv, FINDING_HEADERS, type FindingForExport } from "@/lib/export/findings-rows";

function mk(over: Partial<FindingForExport> = {}): FindingForExport {
  return {
    id: "f1",
    source: "STIG",
    systemId: "s1",
    assetId: "a1",
    scanImportId: null,
    ruleId: "SV-230264r627750_rule",
    groupId: "V-230264",
    stigId: "RHEL-08-010120",
    title: "RHEL 8 must encrypt stored passwords",
    description: null,
    severity: "MEDIUM",
    status: "OPEN",
    checkText: null,
    fixText: null,
    comments: null,
    pluginId: null,
    cve: null,
    assigneeId: null,
    firstSeen: new Date("2026-01-02T00:00:00Z"),
    lastSeen: new Date("2026-03-04T00:00:00Z"),
    closedAt: null,
    resolvedByRescan: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    poamId: null,
    system: { acronym: "MDP", name: "Mission Data Platform" },
    asset: { hostname: "web01", ipAddress: "10.10.20.11" },
    controls: [{ controlId: "IA-5" }, { controlId: "IA-2" }],
    assignee: { name: "Jordan Engineer" },
    ...over,
  } as FindingForExport;
}

describe("buildFindingsCsv", () => {
  it("emits a header row and one row per finding", () => {
    const csv = buildFindingsCsv([mk(), mk({ id: "f2", severity: "HIGH" })]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(FINDING_HEADERS.join(","));
    expect(lines).toHaveLength(3);
  });

  it("includes key fields and joins mapped controls", () => {
    const [_, row] = buildFindingsCsv([mk()]).split("\r\n");
    expect(row).toContain("MDP");
    expect(row).toContain("RHEL-08-010120");
    expect(row).toContain("web01");
    expect(row).toContain("IA-5 IA-2");
    expect(row).toContain("2026-01-02");
  });

  it("escapes commas and quotes per RFC 4180", () => {
    const row = buildFindingsCsv([mk({ title: 'Weak "crypto", bad' })]).split("\r\n")[1];
    expect(row).toContain('"Weak ""crypto"", bad"');
  });

  it("falls back to ruleId/plugin and handles null asset", () => {
    const row = buildFindingsCsv([
      mk({ source: "ACAS", pluginId: "190123", stigId: null, asset: null, cve: "CVE-2024-12345" }),
    ]).split("\r\n")[1];
    expect(row).toContain("ACAS");
    expect(row).toContain("190123");
    expect(row).toContain("CVE-2024-12345");
  });
});
