import { prisma } from "@/lib/db";
import type { ImpactLevel, Prisma } from "@prisma/client";

// Which catalog baseline applies at each categorization (high-water mark).
const BASELINE_FILTER: Record<ImpactLevel, Prisma.ControlWhereInput> = {
  LOW: { baselineLow: true },
  MODERATE: { baselineModerate: true },
  HIGH: { baselineHigh: true },
};

const IMPLEMENTED_STATUSES = ["IMPLEMENTED", "INHERITED", "NOT_APPLICABLE"] as const;

export interface FamilyCoverage {
  family: string;
  baseline: number;
  documented: number;
  implemented: number;
  gaps: number; // baseline controls not implemented/inherited/NA
}

/**
 * Baseline control coverage for a system: for its categorization's 800-53
 * baseline, how many controls are documented vs implemented, and where the
 * SSP gaps are (by family). "Gap" = a baseline control with no implementation
 * or an implementation status that isn't implemented/inherited/N-A.
 */
export async function gatherCoverage(systemId: string) {
  const system = await prisma.system.findUnique({ where: { id: systemId } });
  if (!system) return null;

  const baselineControls = await prisma.control.findMany({
    where: BASELINE_FILTER[system.categorization],
    select: { id: true, family: true },
  });
  const scs = await prisma.systemControl.findMany({
    where: { systemId },
    select: { controlId: true, status: true },
  });
  const statusByControl = new Map(scs.map((s) => [s.controlId, s.status]));

  const fam = new Map<string, FamilyCoverage>();
  for (const c of baselineControls) {
    const f = fam.get(c.family) ?? { family: c.family, baseline: 0, documented: 0, implemented: 0, gaps: 0 };
    f.baseline++;
    const status = statusByControl.get(c.id);
    if (status) f.documented++;
    if (status && (IMPLEMENTED_STATUSES as readonly string[]).includes(status)) f.implemented++;
    else f.gaps++;
    fam.set(c.family, f);
  }

  const families = [...fam.values()].sort((a, b) => a.family.localeCompare(b.family));
  const totals = families.reduce(
    (t, f) => ({
      baseline: t.baseline + f.baseline,
      documented: t.documented + f.documented,
      implemented: t.implemented + f.implemented,
      gaps: t.gaps + f.gaps,
    }),
    { baseline: 0, documented: 0, implemented: 0, gaps: 0 }
  );

  return { system, families, totals, baselineLabel: system.categorization };
}

/** Baseline controls for a single family with their implementation status. */
export async function gatherFamilyControls(systemId: string, family: string) {
  const system = await prisma.system.findUnique({
    where: { id: systemId },
    select: { categorization: true },
  });
  if (!system) return [];

  const controls = await prisma.control.findMany({
    where: { AND: [BASELINE_FILTER[system.categorization], { family }] },
    orderBy: { id: "asc" },
    select: { id: true, title: true },
  });
  const scs = await prisma.systemControl.findMany({
    where: { systemId, controlId: { in: controls.map((c) => c.id) } },
    select: { controlId: true, status: true, narrative: true },
  });
  const byId = new Map(scs.map((s) => [s.controlId, s]));

  return controls.map((c) => ({
    id: c.id,
    title: c.title,
    status: byId.get(c.id)?.status ?? null,
    narrative: byId.get(c.id)?.narrative ?? null,
  }));
}
