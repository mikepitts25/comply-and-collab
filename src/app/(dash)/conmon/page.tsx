import Link from "next/link";
import { prisma } from "@/lib/db";
import { gatherConmon } from "@/lib/conmon";
import { TrendChart } from "@/components/trend-chart";
import { fmtDate } from "@/lib/format";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };

export default async function ConmonPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const systems = await prisma.system.findMany({ orderBy: { acronym: "asc" } });
  const systemId =
    (typeof sp.system === "string" ? sp.system : undefined) ?? systems[0]?.id;

  const data = systemId ? await gatherConmon(systemId) : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Continuous Monitoring</h1>
        <p className="text-sm text-ink-500">
          Posture trends, finding burndown, and aging. Rescans auto-close
          remediated findings and complete resolved POA&Ms.
        </p>
      </div>

      {/* System selector */}
      <div className="flex flex-wrap gap-2">
        {systems.map((s) => (
          <Link
            key={s.id}
            href={`/conmon?system=${s.id}`}
            className={
              "rounded-md px-3 py-1.5 text-sm font-medium " +
              (s.id === systemId
                ? "bg-ink-900 text-white"
                : "bg-ink-100 text-ink-600 hover:bg-ink-200")
            }
          >
            {s.acronym}
          </Link>
        ))}
      </div>

      {!data ? (
        <p className="text-sm text-ink-500">No systems to monitor yet.</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Open findings" value={data.openCount} accent="text-red-600">
              <DeltaBadge delta={data.openDelta} />
            </Kpi>
            <Kpi label="Closed to date" value={data.closedCount} accent="text-green-600" />
            <Kpi label="Mean age (open)" value={`${data.meanAge}d`} />
            <Kpi
              label="Aged 90+ days"
              value={data.buckets[3].count}
              accent={data.buckets[3].count ? "text-red-600" : undefined}
            />
          </div>

          {/* Trend chart */}
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-700">
              Open findings over time — {data.system.acronym}
            </h2>
            <TrendChart data={data.trend} />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Aging */}
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink-700">
                Open finding aging
              </h2>
              <div className="space-y-2">
                {data.buckets.map((b) => {
                  const max = Math.max(1, ...data.buckets.map((x) => x.count));
                  return (
                    <div key={b.label} className="flex items-center gap-3">
                      <span className="w-28 text-xs text-ink-600">{b.label}</span>
                      <div className="h-4 flex-1 rounded bg-ink-100">
                        <div
                          className={`h-4 rounded ${b.overdue ? "bg-red-500" : "bg-ink-400"}`}
                          style={{ width: `${(b.count / max) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm text-ink-800">{b.count}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-ink-500">
                Findings aged 90+ days are past the standard CAT III remediation window.
              </p>
            </div>

            {/* Scan cadence */}
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink-700">Recent scans</h2>
              <table className="w-full">
                <thead className="border-b border-ink-200">
                  <tr>
                    <th className="th">File</th>
                    <th className="th">Type</th>
                    <th className="th">Open</th>
                    <th className="th">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {data.recentScans.map((s) => (
                    <tr key={s.id}>
                      <td className="td max-w-[12rem] truncate text-xs font-medium">{s.filename}</td>
                      <td className="td text-xs">{s.type}</td>
                      <td className="td text-xs text-red-600">{s.openFindings}</td>
                      <td className="td text-xs text-ink-500">{fmtDate(s.importedAt)}</td>
                    </tr>
                  ))}
                  {data.recentScans.length === 0 && (
                    <tr><td className="td text-ink-500" colSpan={4}>No scans imported yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  children,
}: {
  label: string;
  value: number | string;
  accent?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`text-3xl font-semibold ${accent ?? "text-ink-900"}`}>{value}</span>
        {children}
      </div>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-ink-500">
        <Minus className="h-3 w-3" /> 0
      </span>
    );
  const down = delta < 0;
  return (
    <span
      className={
        "inline-flex items-center gap-0.5 text-xs font-medium " +
        (down ? "text-green-600" : "text-red-600")
      }
    >
      {down ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
      {Math.abs(delta)}
    </span>
  );
}
