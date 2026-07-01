import { prisma } from "@/lib/db";
import { gatherCoverage } from "@/lib/coverage";

export interface SystemScore {
  id: string;
  acronym: string;
  name: string;
  categorization: string;
  authorizationStatus: string;
  atoExpiration: Date | null;
  isProvider: boolean;
  open: { critical: number; high: number; medium: number; low: number };
  poamsOpen: number;
  coveragePct: number; // implemented / baseline
}

/** Roll up every system into an executive risk scorecard. */
export async function gatherPortfolio() {
  const systems = await prisma.system.findMany({ orderBy: { acronym: "asc" } });

  const scores: SystemScore[] = [];
  for (const s of systems) {
    const [sev, poamsOpen, cov] = await Promise.all([
      prisma.finding.groupBy({
        by: ["severity"],
        where: { systemId: s.id, status: "OPEN" },
        _count: true,
      }),
      prisma.poam.count({
        where: { systemId: s.id, status: { in: ["DRAFT", "OPEN", "ONGOING"] } },
      }),
      gatherCoverage(s.id),
    ]);
    const c = (x: string) => sev.find((g) => g.severity === x)?._count ?? 0;
    scores.push({
      id: s.id,
      acronym: s.acronym,
      name: s.name,
      categorization: s.categorization,
      authorizationStatus: s.authorizationStatus,
      atoExpiration: s.atoExpiration,
      isProvider: s.isCommonControlProvider,
      open: { critical: c("CRITICAL"), high: c("HIGH"), medium: c("MEDIUM"), low: c("LOW") },
      poamsOpen,
      coveragePct: cov && cov.totals.baseline ? Math.round((cov.totals.implemented / cov.totals.baseline) * 100) : 0,
    });
  }

  const totals = {
    systems: scores.length,
    withAto: scores.filter((s) => ["ATO", "ATO_WITH_CONDITIONS"].includes(s.authorizationStatus)).length,
    openFindings: scores.reduce((n, s) => n + s.open.critical + s.open.high + s.open.medium + s.open.low, 0),
    critHigh: scores.reduce((n, s) => n + s.open.critical + s.open.high, 0),
    poamsOpen: scores.reduce((n, s) => n + s.poamsOpen, 0),
  };

  const riskAcceptances = await prisma.riskAcceptance.count();

  return { scores, totals, riskAcceptances, generatedAt: new Date() };
}

export type PortfolioData = Awaited<ReturnType<typeof gatherPortfolio>>;

export function portfolioMarkdown(d: PortfolioData): string {
  const L: string[] = [];
  L.push("# Compliance Portfolio — Executive Risk Scorecard");
  L.push("");
  L.push(`_Generated ${d.generatedAt.toISOString().slice(0, 10)} · Comply & Collab_`);
  L.push("");
  L.push(`Systems: ${d.totals.systems} · With ATO: ${d.totals.withAto} · Open findings: ${d.totals.openFindings} (Crit+High ${d.totals.critHigh}) · Active POA&Ms: ${d.totals.poamsOpen} · Risk acceptances: ${d.riskAcceptances}`);
  L.push("");
  L.push(`| System | Categorization | ATO | Expires | Crit | High | Med | Low | POA&Ms | Coverage |`);
  L.push(`| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
  for (const s of d.scores) {
    L.push(
      `| ${s.acronym} | ${s.categorization} | ${s.authorizationStatus.replace(/_/g, " ")} | ${s.atoExpiration ? s.atoExpiration.toISOString().slice(0, 10) : "—"} | ${s.open.critical} | ${s.open.high} | ${s.open.medium} | ${s.open.low} | ${s.poamsOpen} | ${s.coveragePct}% |`
    );
  }
  L.push("");
  return L.join("\n");
}
