import Link from "next/link";
import { prisma } from "@/lib/db";
import { AtoBadge, ImpactBadge } from "@/components/badges";
import { fmtDate, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SystemsPage() {
  const systems = await prisma.system.findMany({
    orderBy: { acronym: "asc" },
    include: {
      _count: { select: { assets: true, findings: true, poams: true } },
      findings: { where: { status: "OPEN" }, select: { severity: true } },
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Systems</h1>
        <p className="text-sm text-ink-500">
          Authorization boundaries and their compliance posture.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {systems.map((s) => {
          const open = s.findings.length;
          const highs = s.findings.filter(
            (f) => f.severity === "CRITICAL" || f.severity === "HIGH"
          ).length;
          const d = daysUntil(s.atoExpiration);
          return (
            <Link key={s.id} href={`/systems/${s.id}`} className="card p-5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink-900">
                    {s.acronym}
                  </h2>
                  <p className="text-sm text-ink-500">{s.name}</p>
                </div>
                <AtoBadge value={s.authorizationStatus} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-ink-400">Categorization:</span>
                <ImpactBadge value={s.categorization} />
                <span className="text-[11px] text-ink-400">
                  (C:{s.confidentiality[0]} I:{s.integrity[0]} A:{s.availability[0]})
                </span>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                <Stat label="Assets" value={s._count.assets} />
                <Stat label="Open" value={open} accent={open ? "text-red-600" : undefined} />
                <Stat label="Crit/High" value={highs} accent={highs ? "text-orange-600" : undefined} />
                <Stat label="POA&Ms" value={s._count.poams} />
              </div>
              <div className="mt-3 text-xs text-ink-500">
                ATO expires {fmtDate(s.atoExpiration)}
                {d !== null && (
                  <span className={d < 90 ? " font-medium text-red-600" : ""}> · {d} days</span>
                )}
              </div>
            </Link>
          );
        })}
        {systems.length === 0 && (
          <p className="text-sm text-ink-500">No systems yet.</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-md bg-ink-50 p-2">
      <div className={`text-lg font-semibold ${accent ?? "text-ink-900"}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-ink-400">{label}</div>
    </div>
  );
}
