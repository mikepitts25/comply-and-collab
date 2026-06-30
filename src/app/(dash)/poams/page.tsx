import Link from "next/link";
import { prisma } from "@/lib/db";
import { SeverityBadge, PoamStatusBadge } from "@/components/badges";
import { fmtDate, daysUntil, poamNumber } from "@/lib/format";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PoamsPage() {
  const poams = await prisma.poam.findMany({
    orderBy: [{ status: "asc" }, { severity: "asc" }, { scheduledCompletion: "asc" }],
    include: {
      system: true,
      owner: true,
      controls: true,
      _count: { select: { findings: true, milestones: true } },
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Plan of Action &amp; Milestones</h1>
          <p className="text-sm text-ink-500">
            Auto-generated from open findings, grouped by weakness and mapped to controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/export/poam-xlsx" className="btn-ghost" download>
            <Download className="h-4 w-4" /> eMASS XLSX
          </a>
          <a href="/api/export/poam" className="btn-ghost" download>
            <Download className="h-4 w-4" /> CSV
          </a>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              <th className="th">ID</th>
              <th className="th">Weakness</th>
              <th className="th">System</th>
              <th className="th">Severity</th>
              <th className="th">Controls</th>
              <th className="th">Owner</th>
              <th className="th">Scheduled</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {poams.map((p) => {
              const d = daysUntil(p.scheduledCompletion);
              const overdue = d !== null && d < 0 && !["COMPLETED", "CLOSED"].includes(p.status);
              return (
                <tr key={p.id} className="hover:bg-ink-50">
                  <td className="td font-mono text-xs">{poamNumber(p.number)}</td>
                  <td className="td max-w-sm">
                    <Link href={`/poams/${p.id}`} className="font-medium text-ink-900 hover:underline">
                      {p.weakness}
                    </Link>
                    <div className="text-[11px] text-ink-400">
                      {p._count.findings} finding(s) · {p._count.milestones} milestone(s)
                    </div>
                  </td>
                  <td className="td text-xs">{p.system.acronym}</td>
                  <td className="td"><SeverityBadge value={p.severity} /></td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1">
                      {p.controls.slice(0, 3).map((c) => (
                        <span key={c.controlId} className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[11px] text-ink-700">
                          {c.controlId}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="td text-xs">{p.owner?.name ?? "—"}</td>
                  <td className="td text-xs">
                    <span className={overdue ? "font-medium text-red-600" : "text-ink-600"}>
                      {fmtDate(p.scheduledCompletion)}
                      {overdue ? " (overdue)" : ""}
                    </span>
                  </td>
                  <td className="td"><PoamStatusBadge value={p.status} /></td>
                </tr>
              );
            })}
            {poams.length === 0 && (
              <tr><td className="td text-ink-500" colSpan={8}>No POA&Ms. Import scans and generate from a system page.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
