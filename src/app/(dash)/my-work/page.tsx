import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { SeverityBadge, FindingStatusBadge, PoamStatusBadge } from "@/components/badges";
import { fmtDate, daysUntil, poamNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MyWorkPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const canReview = can(user.role, "risk:accept");

  const now = new Date();
  const in30 = new Date(now);
  in30.setDate(in30.getDate() + 30);

  const [findings, poams, reviews] = await Promise.all([
    prisma.finding.findMany({
      where: { assigneeId: user.id, status: { in: ["OPEN", "NOT_REVIEWED"] } },
      orderBy: [{ severity: "asc" }, { lastSeen: "desc" }],
      include: { system: true, asset: true },
      take: 100,
    }),
    prisma.poam.findMany({
      where: { ownerId: user.id, status: { in: ["DRAFT", "OPEN", "ONGOING"] } },
      orderBy: [{ scheduledCompletion: "asc" }],
      include: { system: true },
      take: 100,
    }),
    canReview
      ? prisma.riskAcceptance.findMany({
          where: { reviewBy: { lte: in30 } },
          orderBy: { reviewBy: "asc" },
          include: { poam: { include: { system: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">My Work</h1>
        <p className="text-sm text-ink-500">Items assigned to or owned by {user.name}.</p>
      </div>

      {/* Assigned findings */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3 text-sm font-semibold text-ink-700">
          Assigned findings ({findings.length})
        </div>
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr><th className="th">Severity</th><th className="th">Finding</th><th className="th">System</th><th className="th">Asset</th><th className="th">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {findings.map((f) => (
              <tr key={f.id} className="hover:bg-ink-50">
                <td className="td"><SeverityBadge value={f.severity} /></td>
                <td className="td"><Link href={`/findings/${f.id}`} className="font-medium text-ink-900 hover:underline">{f.title}</Link></td>
                <td className="td text-xs">{f.system.acronym}</td>
                <td className="td text-xs">{f.asset?.hostname ?? "—"}</td>
                <td className="td"><FindingStatusBadge value={f.status} /></td>
              </tr>
            ))}
            {findings.length === 0 && <tr><td className="td text-ink-500" colSpan={5}>No findings assigned to you.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Owned POA&Ms */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3 text-sm font-semibold text-ink-700">
          POA&Ms I own ({poams.length})
        </div>
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr><th className="th">ID</th><th className="th">Weakness</th><th className="th">System</th><th className="th">Severity</th><th className="th">Scheduled</th><th className="th">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {poams.map((p) => {
              const d = daysUntil(p.scheduledCompletion);
              const overdue = d !== null && d < 0;
              return (
                <tr key={p.id} className="hover:bg-ink-50">
                  <td className="td font-mono text-xs">{poamNumber(p.number)}</td>
                  <td className="td"><Link href={`/poams/${p.id}`} className="font-medium text-ink-900 hover:underline">{p.weakness}</Link></td>
                  <td className="td text-xs">{p.system.acronym}</td>
                  <td className="td"><SeverityBadge value={p.severity} /></td>
                  <td className={"td text-xs " + (overdue ? "font-medium text-red-600" : "text-ink-600")}>
                    {fmtDate(p.scheduledCompletion)}{d !== null ? ` (${d}d${overdue ? ", overdue" : ""})` : ""}
                  </td>
                  <td className="td"><PoamStatusBadge value={p.status} /></td>
                </tr>
              );
            })}
            {poams.length === 0 && <tr><td className="td text-ink-500" colSpan={6}>No POA&Ms owned by you.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Risk reviews (senior roles) */}
      {canReview && (
        <div className="card overflow-hidden">
          <div className="border-b border-ink-200 px-5 py-3 text-sm font-semibold text-ink-700">
            Risk acceptances due for review ({reviews.length})
          </div>
          <table className="w-full">
            <thead className="border-b border-ink-200 bg-ink-50">
              <tr><th className="th">POA&M</th><th className="th">System</th><th className="th">AO</th><th className="th">Review by</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {reviews.map((r) => {
                const d = daysUntil(r.reviewBy);
                return (
                  <tr key={r.id} className="hover:bg-ink-50">
                    <td className="td"><Link href={`/poams/${r.poamId}`} className="font-mono text-xs text-ink-900 hover:underline">{poamNumber(r.poam.number)}</Link></td>
                    <td className="td text-xs">{r.poam.system.acronym}</td>
                    <td className="td text-xs">{r.authorizingOfficial}</td>
                    <td className={"td text-xs " + (d !== null && d < 0 ? "font-medium text-red-600" : "text-ink-600")}>{fmtDate(r.reviewBy)}{d !== null ? ` (${d}d)` : ""}</td>
                  </tr>
                );
              })}
              {reviews.length === 0 && <tr><td className="td text-ink-500" colSpan={4}>No risk acceptances due for review.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
