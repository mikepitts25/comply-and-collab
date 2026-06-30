import { prisma } from "@/lib/db";

export interface TrendPoint {
  takenAt: Date;
  openCritical: number;
  openHigh: number;
  openMedium: number;
  openLow: number;
  totalOpen: number;
  closedTotal: number;
}

export interface AgingBucket {
  label: string;
  count: number;
  overdue: boolean;
}

/** Gather continuous-monitoring data for one system. */
export async function gatherConmon(systemId: string) {
  const system = await prisma.system.findUnique({ where: { id: systemId } });
  if (!system) return null;

  const [snapshots, openFindings, recentScans, closedCount] = await Promise.all([
    prisma.postureSnapshot.findMany({
      where: { systemId },
      orderBy: { takenAt: "asc" },
    }),
    prisma.finding.findMany({
      where: { systemId, status: "OPEN" },
      select: { severity: true, firstSeen: true },
    }),
    prisma.scanImport.findMany({
      where: { systemId },
      orderBy: { importedAt: "desc" },
      take: 8,
      include: { importedBy: true },
    }),
    prisma.finding.count({ where: { systemId, status: "CLOSED" } }),
  ]);

  const trend: TrendPoint[] = snapshots.map((s) => ({
    takenAt: s.takenAt,
    openCritical: s.openCritical,
    openHigh: s.openHigh,
    openMedium: s.openMedium,
    openLow: s.openLow,
    totalOpen: s.totalOpen,
    closedTotal: s.closedTotal,
  }));

  // Aging of currently-open findings by age since first detection.
  const now = Date.now();
  const ageDays = (d: Date) => Math.floor((now - d.getTime()) / 86_400_000);
  const buckets: AgingBucket[] = [
    { label: "0–30 days", count: 0, overdue: false },
    { label: "31–60 days", count: 0, overdue: false },
    { label: "61–90 days", count: 0, overdue: false },
    { label: "90+ days", count: 0, overdue: true },
  ];
  let ageSum = 0;
  for (const f of openFindings) {
    const a = ageDays(f.firstSeen);
    ageSum += a;
    if (a <= 30) buckets[0].count++;
    else if (a <= 60) buckets[1].count++;
    else if (a <= 90) buckets[2].count++;
    else buckets[3].count++;
  }
  const meanAge = openFindings.length
    ? Math.round(ageSum / openFindings.length)
    : 0;

  const current = trend[trend.length - 1];
  const previous = trend.length > 1 ? trend[trend.length - 2] : undefined;
  const openDelta = current && previous ? current.totalOpen - previous.totalOpen : 0;

  return {
    system,
    trend,
    buckets,
    meanAge,
    openCount: openFindings.length,
    closedCount,
    openDelta,
    recentScans,
  };
}

export type ConmonData = NonNullable<Awaited<ReturnType<typeof gatherConmon>>>;
