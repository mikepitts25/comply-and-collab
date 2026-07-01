import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { SeverityBadge, FindingStatusBadge } from "@/components/badges";
import { fmtDate } from "@/lib/format";
import { BulkBar } from "./bulk-bar";
import type { Prisma, Severity, FindingStatus, FindingSource } from "@prisma/client";

export const dynamic = "force-dynamic";

const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
const STATUSES: FindingStatus[] = ["OPEN", "NOT_A_FINDING", "NOT_APPLICABLE", "NOT_REVIEWED", "CLOSED"];
const SOURCES: FindingSource[] = ["ACAS", "STIG", "SCAP", "MANUAL"];

type SP = { [k: string]: string | string[] | undefined };

export default async function FindingsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const sev = typeof sp.severity === "string" ? sp.severity : undefined;
  const status = typeof sp.status === "string" ? sp.status : "OPEN";
  const source = typeof sp.source === "string" ? sp.source : undefined;
  const systemId = typeof sp.system === "string" ? sp.system : undefined;

  const where: Prisma.FindingWhereInput = {};
  if (sev && SEVERITIES.includes(sev as Severity)) where.severity = sev as Severity;
  if (status && status !== "ALL" && STATUSES.includes(status as FindingStatus))
    where.status = status as FindingStatus;
  if (source && SOURCES.includes(source as FindingSource)) where.source = source as FindingSource;
  if (systemId) where.systemId = systemId;

  const [findings, systems, total] = await Promise.all([
    prisma.finding.findMany({
      where,
      orderBy: [{ severity: "asc" }, { lastSeen: "desc" }],
      take: 200,
      include: {
        system: true,
        asset: true,
        controls: true,
        assignee: true,
      },
    }),
    prisma.system.findMany({ orderBy: { acronym: "asc" } }),
    prisma.finding.count({ where }),
  ]);

  const sessionUser = await getSessionUser();
  const canUpdate = sessionUser ? can(sessionUser.role, "finding:update") : false;
  const users = canUpdate
    ? await prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } })
    : [];

  const buildQuery = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { severity: sev, status, source, system: systemId, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    return `/findings?${params.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Findings</h1>
          <p className="text-sm text-ink-500">
            Unified ACAS &amp; STIG findings correlated to NIST 800-53 controls.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-500">{total} matching</span>
          <a
            href={`/api/export/findings?${buildQuery({}).split("?")[1] ?? ""}`}
            className="btn-ghost"
            download
            title="Export the current findings register (respects filters) as CSV"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <FilterGroup label="Status" current={status} options={["ALL", ...STATUSES]} param="status" build={buildQuery} />
        <FilterGroup label="Severity" current={sev ?? "ALL"} options={["ALL", ...SEVERITIES]} param="severity" build={buildQuery} />
        <FilterGroup label="Source" current={source ?? "ALL"} options={["ALL", ...SOURCES]} param="source" build={buildQuery} />
      </div>

      <BulkBar users={users} enabled={canUpdate}>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              {canUpdate && <th className="th w-8" />}
              <th className="th">Severity</th>
              <th className="th">Finding</th>
              <th className="th">Source</th>
              <th className="th">Asset</th>
              <th className="th">System</th>
              <th className="th">Controls</th>
              <th className="th">Status</th>
              <th className="th">Assignee</th>
              <th className="th">Last seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {findings.map((f) => (
              <tr key={f.id} className="hover:bg-ink-50">
                {canUpdate && (
                  <td className="td"><input type="checkbox" name="findingIds" value={f.id} className="h-4 w-4" /></td>
                )}
                <td className="td"><SeverityBadge value={f.severity} /></td>
                <td className="td max-w-md">
                  <Link href={`/findings/${f.id}`} className="font-medium text-ink-900 hover:underline">
                    {f.title}
                  </Link>
                  <div className="font-mono text-[11px] text-ink-400">
                    {f.stigId ?? f.pluginId ?? f.ruleId}
                    {f.cve ? ` · ${f.cve}` : ""}
                  </div>
                </td>
                <td className="td text-xs">{f.source}</td>
                <td className="td text-xs">{f.asset?.hostname ?? "—"}</td>
                <td className="td text-xs">{f.system.acronym}</td>
                <td className="td">
                  <div className="flex flex-wrap gap-1">
                    {f.controls.slice(0, 4).map((c) => (
                      <span key={c.controlId} className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[11px] text-ink-700">
                        {c.controlId}
                      </span>
                    ))}
                    {f.controls.length === 0 && <span className="text-xs text-ink-400">—</span>}
                  </div>
                </td>
                <td className="td"><FindingStatusBadge value={f.status} /></td>
                <td className="td text-xs">{f.assignee?.name ?? "—"}</td>
                <td className="td text-xs text-ink-500">{fmtDate(f.lastSeen)}</td>
              </tr>
            ))}
            {findings.length === 0 && (
              <tr>
                <td className="td text-ink-500" colSpan={canUpdate ? 10 : 9}>
                  No findings match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </BulkBar>
    </div>
  );
}

function FilterGroup({
  label,
  current,
  options,
  param,
  build,
}: {
  label: string;
  current: string;
  options: string[];
  param: string;
  build: (o: Record<string, string | undefined>) => string;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="px-1 text-xs font-semibold uppercase text-ink-400">{label}:</span>
      {options.map((o) => {
        const active = current === o;
        const value = o === "ALL" ? undefined : o;
        return (
          <Link
            key={o}
            href={build({ [param]: value })}
            className={
              "rounded px-2 py-1 text-xs font-medium " +
              (active ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200")
            }
          >
            {o.replace(/_/g, " ")}
          </Link>
        );
      })}
    </div>
  );
}
