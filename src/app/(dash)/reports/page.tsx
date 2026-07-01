import Link from "next/link";
import { gatherPortfolio } from "@/lib/portfolio";
import { fmtDate, daysUntil } from "@/lib/format";
import { AtoBadge, ImpactBadge } from "@/components/badges";
import { PrintButton } from "@/components/print-button";
import { Download } from "lucide-react";
import type { AuthorizationStatus, ImpactLevel } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const d = await gatherPortfolio();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Portfolio Risk Scorecard</h1>
          <p className="text-sm text-ink-500">Executive cross-system compliance rollup.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/export/portfolio" className="btn-ghost" download>
            <Download className="h-4 w-4" /> Markdown
          </a>
          <PrintButton />
        </div>
      </div>

      <article className="card space-y-6 p-8 print:border-0 print:shadow-none">
        <header className="border-b border-ink-200 pb-4 print:block hidden">
          <h1 className="text-xl font-semibold text-ink-900">Compliance Portfolio — Executive Risk Scorecard</h1>
          <p className="text-xs text-ink-500">Generated {fmtDate(d.generatedAt)} · Comply &amp; Collab · For Official Use Only</p>
        </header>

        {/* Portfolio KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi label="Systems" value={d.totals.systems} />
          <Kpi label="With ATO" value={d.totals.withAto} />
          <Kpi label="Open findings" value={d.totals.openFindings} />
          <Kpi label="Crit + High" value={d.totals.critHigh} accent="text-red-600" />
          <Kpi label="Active POA&Ms" value={d.totals.poamsOpen} />
        </div>

        {/* Scorecard */}
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              <th className="th">System</th><th className="th">Cat</th><th className="th">ATO</th>
              <th className="th">Expires</th><th className="th">Crit</th><th className="th">High</th>
              <th className="th">Med</th><th className="th">Low</th><th className="th">POA&Ms</th>
              <th className="th">Coverage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {d.scores.map((s) => {
              const dd = daysUntil(s.atoExpiration);
              return (
                <tr key={s.id} className="hover:bg-ink-50">
                  <td className="td">
                    <Link href={`/systems/${s.id}`} className="font-medium text-ink-900 hover:underline">{s.acronym}</Link>
                    {s.isProvider && <span className="ml-1 rounded bg-purple-50 px-1 text-[10px] text-purple-700">CCP</span>}
                  </td>
                  <td className="td"><ImpactBadge value={s.categorization as ImpactLevel} /></td>
                  <td className="td"><AtoBadge value={s.authorizationStatus as AuthorizationStatus} /></td>
                  <td className={"td text-xs " + (dd !== null && dd < 90 ? "font-medium text-red-600" : "text-ink-500")}>
                    {fmtDate(s.atoExpiration)}{dd !== null ? ` (${dd}d)` : ""}
                  </td>
                  <td className="td font-medium text-red-700">{s.open.critical || ""}</td>
                  <td className="td text-red-600">{s.open.high || ""}</td>
                  <td className="td text-orange-600">{s.open.medium || ""}</td>
                  <td className="td text-yellow-700">{s.open.low || ""}</td>
                  <td className="td">{s.poamsOpen}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded bg-ink-100">
                        <div className="h-2 rounded bg-green-500" style={{ width: `${s.coveragePct}%` }} />
                      </div>
                      <span className="text-xs text-ink-500">{s.coveragePct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="text-xs text-ink-400">
          {d.riskAcceptances} formal risk acceptance(s) on record. CCP = common control provider.
        </p>
      </article>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-md border border-ink-200 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent ?? "text-ink-900"}`}>{value}</div>
    </div>
  );
}
