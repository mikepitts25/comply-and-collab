import { prisma } from "@/lib/db";
import { gatherCoverage } from "@/lib/coverage";
import { fmtDate } from "@/lib/format";

/** Gather everything for a system's Security Assessment Report (SAR). */
export async function gatherSar(systemId: string) {
  const system = await prisma.system.findUnique({ where: { id: systemId } });
  if (!system) return null;

  const [scansByType, openBySev, openBySource, closed, poamsBySev, coverage, lastScan] =
    await Promise.all([
      prisma.scanImport.groupBy({ by: ["type"], where: { systemId }, _count: true }),
      prisma.finding.groupBy({ by: ["severity"], where: { systemId, status: "OPEN" }, _count: true }),
      prisma.finding.groupBy({ by: ["source"], where: { systemId, status: "OPEN" }, _count: true }),
      prisma.finding.count({ where: { systemId, status: "CLOSED" } }),
      prisma.poam.groupBy({ by: ["severity"], where: { systemId, status: { in: ["DRAFT", "OPEN", "ONGOING"] } }, _count: true }),
      gatherCoverage(systemId),
      prisma.scanImport.findFirst({ where: { systemId }, orderBy: { importedAt: "desc" } }),
    ]);

  const sev = (g: { severity: string; _count: number }[], s: string) =>
    g.find((x) => x.severity === s)?._count ?? 0;
  const openCrit = sev(openBySev, "CRITICAL");
  const openHigh = sev(openBySev, "HIGH");

  // Overall residual-risk determination from the highest open severity.
  const riskLevel = openCrit > 0 ? "HIGH" : openHigh > 0 ? "HIGH" : sev(openBySev, "MEDIUM") > 0 ? "MODERATE" : "LOW";

  return {
    system,
    generatedAt: new Date(),
    lastScanAt: lastScan?.importedAt ?? null,
    scansByType,
    openBySev,
    openBySource,
    closed,
    poamsBySev,
    coverage,
    riskLevel,
    openCrit,
    openHigh,
    totalOpen: openBySev.reduce((n, g) => n + g._count, 0),
    totalPoams: poamsBySev.reduce((n, g) => n + g._count, 0),
  };
}

export type SarData = NonNullable<Awaited<ReturnType<typeof gatherSar>>>;

export function sarMarkdown(d: SarData): string {
  const s = d.system;
  const sev = (g: { severity: string; _count: number }[], x: string) => g.find((y) => y.severity === x)?._count ?? 0;
  const L: string[] = [];
  L.push(`# Security Assessment Report (SAR) — ${s.name} (${s.acronym})`);
  L.push("");
  L.push(`_Generated ${fmtDate(d.generatedAt)} · Comply & Collab · For Official Use Only_`);
  L.push("");
  L.push("## 1. Executive Summary");
  L.push("");
  L.push(`- Categorization: **${s.categorization}**`);
  L.push(`- Authorization status: ${s.authorizationStatus.replace(/_/g, " ")}`);
  L.push(`- Last assessment (scan): ${fmtDate(d.lastScanAt)}`);
  L.push(`- Overall residual risk: **${d.riskLevel}**`);
  L.push(`- Open findings: ${d.totalOpen} (Critical ${d.openCrit}, High ${d.openHigh})`);
  L.push("");
  L.push("## 2. Assessment Scope");
  L.push("");
  L.push(`| Source | Imports |`);
  L.push(`| --- | --- |`);
  for (const s2 of d.scansByType) L.push(`| ${s2.type} | ${s2._count} |`);
  if (d.scansByType.length === 0) L.push(`| — | — |`);
  L.push("");
  L.push("## 3. Findings Summary");
  L.push("");
  L.push(`| Severity | Open |`);
  L.push(`| --- | --- |`);
  for (const x of ["CRITICAL", "HIGH", "MEDIUM", "LOW"]) L.push(`| ${x} | ${sev(d.openBySev, x)} |`);
  L.push(`| **Closed to date** | ${d.closed} |`);
  L.push("");
  if (d.coverage) {
    L.push("## 4. Control Assessment Results");
    L.push("");
    L.push(`${s.categorization} baseline: ${d.coverage.totals.baseline} controls · Implemented ${d.coverage.totals.implemented} · Gaps ${d.coverage.totals.gaps}.`);
    L.push("");
  }
  L.push("## 5. Risk Assessment");
  L.push("");
  L.push(`Based on ${d.openCrit} critical and ${d.openHigh} high open findings and ${d.coverage?.totals.gaps ?? 0} control gaps, the assessed residual risk is **${d.riskLevel}**. ${d.totalPoams} POA&M(s) track remediation.`);
  L.push("");
  return L.join("\n");
}
