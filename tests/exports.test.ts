import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { buildPoamXlsx } from "@/lib/export/poam-xlsx";
import { buildInventoryXlsx } from "@/lib/export/inventory-xlsx";
import { portfolioMarkdown } from "@/lib/portfolio";

const poam: any = {
  number: 1,
  weakness: "Kernel update missing",
  severity: "CRITICAL",
  status: "OPEN",
  riskRating: "HIGH",
  residualRisk: null,
  sourceIdentifier: "ACAS Plugin 190123",
  resourcesRequired: null,
  recommendation: "Patch",
  scheduledCompletion: new Date("2026-07-15"),
  owner: { name: "Riley", role: "ANALYST" },
  system: { acronym: "MDP" },
  controls: [{ controlId: "SI-2" }],
  milestones: [{ description: "Do it", dueDate: null, completed: false }],
  findings: [{ stigId: null, asset: { hostname: "web01" } }],
  mitigations: [],
};

describe("POA&M XLSX", () => {
  it("produces a workbook with a POA&M sheet and one row per POA&M", async () => {
    const buf = await buildPoamXlsx([poam, { ...poam, number: 2 }], "Test");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.getWorksheet("POA&M")!;
    expect(ws).toBeTruthy();
    expect(ws.rowCount).toBe(3); // header + 2
    expect(ws.getRow(2).getCell(1).value).toBe("POAM-0001");
    expect(wb.getWorksheet("About")).toBeTruthy();
  });
});

describe("Inventory XLSX", () => {
  const system: any = {
    acronym: "MDP",
    assets: [
      {
        hostname: "web01", fqdn: "web01.demo.mil", ipAddress: "10.0.0.1", macAddress: "00:11",
        type: "SERVER", manufacturer: "Dell", model: "R760", serialNumber: "SN1", osName: "RHEL 8",
        location: "Rack A", virtual: true,
        software: [{ name: "Apache", version: "2.4", vendor: "ASF", type: "APPLICATION" }],
      },
    ],
    ppsm: [{ port: "443", protocol: "TCP", service: "HTTPS", direction: "INBOUND", boundary: "Enclave", classification: "CUI", status: "APPROVED", justification: "web" }],
  };
  it("has Hardware, Software, and PPSM sheets populated", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await buildInventoryXlsx(system));
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Hardware", "Software", "PPSM"]);
    expect(wb.getWorksheet("Hardware")!.rowCount).toBe(2);
    expect(wb.getWorksheet("Software")!.rowCount).toBe(2);
    expect(wb.getWorksheet("PPSM")!.getRow(2).getCell(3).value).toBe("HTTPS");
  });
});

describe("Portfolio Markdown", () => {
  it("renders totals and a row per system", () => {
    const data: any = {
      generatedAt: new Date("2026-07-01"),
      riskAcceptances: 2,
      totals: { systems: 2, withAto: 1, openFindings: 5, critHigh: 3, poamsOpen: 4 },
      scores: [
        { acronym: "MDP", categorization: "HIGH", authorizationStatus: "ATO", atoExpiration: new Date("2026-09-01"), open: { critical: 1, high: 2, medium: 0, low: 0 }, poamsOpen: 3, coveragePct: 40 },
        { acronym: "LSS", categorization: "MODERATE", authorizationStatus: "ATO_WITH_CONDITIONS", atoExpiration: null, open: { critical: 0, high: 0, medium: 2, low: 0 }, poamsOpen: 1, coveragePct: 10 },
      ],
    };
    const md = portfolioMarkdown(data);
    expect(md).toContain("Systems: 2");
    expect(md).toContain("| MDP | HIGH | ATO |");
    expect(md).toContain("| LSS | MODERATE | ATO WITH CONDITIONS |");
    expect(md).toContain("40%");
  });
});
