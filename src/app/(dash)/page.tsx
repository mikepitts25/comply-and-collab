import Link from "next/link";
import { prisma } from "@/lib/db";
import { fmtDate, daysUntil, poamNumber } from "@/lib/format";
import {
  SeverityBadge,
  AtoBadge,
  PoamStatusBadge,
} from "@/components/badges";
import { ShieldAlert, Server, ClipboardList, CalendarClock, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const SEV_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

export default async function Dashboard() {
  const [systems, openFindings, openPoams, sevGroups, recent, expiringSystems] =
    await Promise.all([
      prisma.system.count(),
      prisma.finding.count({ where: { status: "OPEN" } }),
      prisma.poam.count({ where: { status: { in: ["OPEN", "ONGOING", "DRAFT"] } } }),
      prisma.finding.groupBy({
        by: ["severity"],
        where: { status: "OPEN" },
        _count: true,
      }),
      prisma.activity.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { actor: true },
      }),
      prisma.system.findMany({
        orderBy: { atoExpiration: "asc" },
        take: 6,
      }),
    ]);

  const sevCount = (s: string) =>
    sevGroups.find((g) => g.severity === s)?._count ?? 0;

  const topPoams = await prisma.poam.findMany({
    where: { status: { in: ["OPEN", "ONGOING"] } },
    orderBy: [{ severity: "asc" }, { scheduledCompletion: "asc" }],
    take: 6,
    include: { system: true },
  });

  // Attention-required rollup across all systems.
  const now = new Date();
  const in90 = new Date(now);
  in90.setDate(in90.getDate() + 90);
  const aged90 = new Date(now);
  aged90.setDate(aged90.getDate() - 90);
  const in30 = new Date(now);
  in30.setDate(in30.getDate() + 30);
  const [atoExpiring, overduePoams, agedFindings, pendingPpsm, riskReviews, isaExpiring, pendingDeviations] = await Promise.all([
    prisma.system.count({
      where: { authorizationStatus: { in: ["ATO", "ATO_WITH_CONDITIONS", "IATT"] }, atoExpiration: { lte: in90 } },
    }),
    prisma.poam.count({
      where: { status: { in: ["OPEN", "ONGOING", "DRAFT"] }, scheduledCompletion: { lt: now } },
    }),
    prisma.finding.count({ where: { status: "OPEN", firstSeen: { lt: aged90 } } }),
    prisma.ppsmEntry.count({ where: { status: "PENDING" } }),
    prisma.riskAcceptance.count({ where: { reviewBy: { lte: in30 } } }),
    prisma.interconnection.count({
      where: { status: { in: ["ACTIVE", "PENDING_APPROVAL"] }, expiresAt: { lte: in90 } },
    }),
    prisma.deviation.count({ where: { status: "PENDING" } }),
  ]);
  const attention = [
    { n: atoExpiring, label: "ATOs expiring within 90 days", href: "/systems" },
    { n: overduePoams, label: "POA&Ms past their scheduled completion", href: "/poams" },
    { n: agedFindings, label: "Open findings aged over 90 days", href: "/findings" },
    { n: pendingPpsm, label: "PPSM entries pending approval", href: "/systems" },
    { n: riskReviews, label: "Risk acceptances due for review", href: "/poams" },
    { n: isaExpiring, label: "Interconnection agreements expiring within 90 days", href: "/systems" },
    { n: pendingDeviations, label: "Deviation requests awaiting decision", href: "/findings" },
  ].filter((a) => a.n > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Compliance Dashboard</h1>
        <p className="text-sm text-ink-500">
          Cross-system posture across RMF, STIG, and ACAS sources.
        </p>
      </div>

      {/* Attention required */}
      {attention.length > 0 && (
        <div className="card border-amber-200 bg-amber-50 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4" /> Attention required
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {attention.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="flex items-center gap-3 rounded-md bg-white/70 px-3 py-2 hover:bg-white"
              >
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-600 px-2 text-sm font-semibold text-white">
                  {a.n}
                </span>
                <span className="text-sm text-ink-800">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={<Server className="h-5 w-5" />} label="Systems" value={systems} href="/systems" />
        <KpiCard
          icon={<ShieldAlert className="h-5 w-5" />}
          label="Open Findings"
          value={openFindings}
          href="/findings"
          accent="text-red-600"
        />
        <KpiCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="Active POA&Ms"
          value={openPoams}
          href="/poams"
        />
        <KpiCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="Critical + High Open"
          value={sevCount("CRITICAL") + sevCount("HIGH")}
          href="/findings?severity=HIGH"
          accent="text-orange-600"
        />
      </div>

      {/* Severity breakdown */}
      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink-700">
          Open findings by severity
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SEV_ORDER.map((s) => (
            <div key={s} className="rounded-md border border-ink-200 p-3">
              <div className="text-2xl font-semibold text-ink-900">
                {sevCount(s)}
              </div>
              <div className="mt-1">
                <SeverityBadge value={s} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ATO posture */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-700">ATO posture</h2>
          <div className="space-y-3">
            {expiringSystems.map((s) => {
              const d = daysUntil(s.atoExpiration);
              return (
                <Link
                  key={s.id}
                  href={`/systems/${s.id}`}
                  className="flex items-center justify-between rounded-md border border-ink-200 p-3 hover:bg-ink-50"
                >
                  <div>
                    <div className="text-sm font-medium text-ink-900">
                      {s.acronym} — {s.name}
                    </div>
                    <div className="text-xs text-ink-500">
                      ATO expires {fmtDate(s.atoExpiration)}
                      {d !== null && (
                        <span className={d < 90 ? "text-red-600" : ""}>
                          {" "}· {d} days
                        </span>
                      )}
                    </div>
                  </div>
                  <AtoBadge value={s.authorizationStatus} />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Priority POA&Ms */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-700">
            Priority POA&amp;Ms
          </h2>
          <div className="space-y-2">
            {topPoams.map((p) => (
              <Link
                key={p.id}
                href={`/poams/${p.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-ink-200 p-3 hover:bg-ink-50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink-900">
                    <span className="font-mono text-xs text-ink-500">
                      {poamNumber(p.number)}
                    </span>{" "}
                    {p.weakness}
                  </div>
                  <div className="text-xs text-ink-500">
                    {p.system.acronym} · due {fmtDate(p.scheduledCompletion)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <SeverityBadge value={p.severity} />
                  <PoamStatusBadge value={p.status} />
                </div>
              </Link>
            ))}
            {topPoams.length === 0 && (
              <p className="text-sm text-ink-500">No active POA&Ms.</p>
            )}
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink-700">Recent activity</h2>
        <ul className="space-y-2">
          {recent.map((a) => (
            <li key={a.id} className="flex items-start gap-3 text-sm">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ink-300" />
              <div>
                <span className="text-ink-800">{a.summary}</span>{" "}
                <span className="text-ink-400">
                  — {a.actor?.name ?? "system"} · {fmtDate(a.createdAt)}
                </span>
              </div>
            </li>
          ))}
          {recent.length === 0 && (
            <li className="text-sm text-ink-500">No activity yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  href,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
  accent?: string;
}) {
  return (
    <Link href={href} className="card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between text-ink-400">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          {label}
        </span>
        {icon}
      </div>
      <div className={`mt-2 text-3xl font-semibold ${accent ?? "text-ink-900"}`}>
        {value}
      </div>
    </Link>
  );
}
