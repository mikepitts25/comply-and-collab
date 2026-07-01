import Link from "next/link";
import { notFound } from "next/navigation";
import { gatherCoverage, gatherFamilyControls } from "@/lib/coverage";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { familyName } from "@/lib/data/families";
import { documentControlAction, createControlPoamAction } from "@/app/actions/controls";
import { inheritControlsAction } from "@/app/actions/inheritance";
import { prisma } from "@/lib/db";
import type { ControlStatus } from "@prisma/client";

const IMPLEMENTED = ["IMPLEMENTED", "INHERITED", "NOT_APPLICABLE"];

export const dynamic = "force-dynamic";

const STATUSES: ControlStatus[] = [
  "IMPLEMENTED",
  "PARTIALLY_IMPLEMENTED",
  "PLANNED",
  "INHERITED",
  "NOT_APPLICABLE",
  "NOT_IMPLEMENTED",
];

const STATUS_CLS: Record<string, string> = {
  IMPLEMENTED: "text-green-700",
  INHERITED: "text-purple-700",
  NOT_APPLICABLE: "text-ink-500",
  PARTIALLY_IMPLEMENTED: "text-orange-700",
  PLANNED: "text-blue-700",
  NOT_IMPLEMENTED: "text-red-700",
};

type SP = { [k: string]: string | string[] | undefined };

export default async function CoveragePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SP>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const family = typeof sp.family === "string" ? sp.family.toUpperCase() : undefined;

  const data = await gatherCoverage(id);
  if (!data) notFound();
  const user = await getSessionUser();
  const canDoc = user ? can(user.role, "control:document") : false;
  const canPoam = user ? can(user.role, "poam:generate") : false;

  const providers = data.system.isCommonControlProvider
    ? []
    : await prisma.system.findMany({
        where: { isCommonControlProvider: true, id: { not: data.system.id } },
        select: { id: true, acronym: true, name: true },
      });

  const familyControls = family ? await gatherFamilyControls(id, family) : [];
  const pct = (n: number) =>
    data.totals.baseline ? Math.round((n / data.totals.baseline) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/systems/${data.system.id}`} className="text-sm text-ink-500 hover:underline">
          ← Back to {data.system.acronym}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink-900">
          Control Coverage — {data.system.acronym}
        </h1>
        <p className="text-sm text-ink-500">
          NIST 800-53 {data.baselineLabel} baseline · SSP implementation gap analysis.
        </p>
      </div>

      {/* Coverage KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label={`${data.baselineLabel} baseline`} value={data.totals.baseline} />
        <Kpi label="Documented" value={`${data.totals.documented} (${pct(data.totals.documented)}%)`} accent="text-blue-700" />
        <Kpi label="Implemented" value={`${data.totals.implemented} (${pct(data.totals.implemented)}%)`} accent="text-green-700" />
        <Kpi label="Gaps" value={data.totals.gaps} accent={data.totals.gaps ? "text-red-600" : "text-green-700"} />
      </div>

      {/* Coverage bar */}
      <div className="card p-5">
        <div className="mb-2 flex justify-between text-xs text-ink-500">
          <span>Implementation coverage</span>
          <span>{pct(data.totals.implemented)}% of {data.baselineLabel} baseline</span>
        </div>
        <div className="flex h-4 overflow-hidden rounded bg-ink-100">
          <div className="h-4 bg-green-500" style={{ width: `${pct(data.totals.implemented)}%` }} />
          <div className="h-4 bg-blue-400" style={{ width: `${pct(data.totals.documented - data.totals.implemented)}%` }} />
        </div>
      </div>

      {/* Common control inheritance */}
      {canDoc && providers.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-1 text-sm font-semibold text-ink-700">Common control inheritance</h2>
          <p className="mb-3 text-xs text-ink-500">
            Inherit implemented controls from a common control provider (enclave /
            hosting environment) into this system's baseline.
          </p>
          <form action={inheritControlsAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="systemId" value={data.system.id} />
            <select name="providerId" className="input w-72" defaultValue={providers[0]?.id}>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.acronym} — {p.name}</option>
              ))}
            </select>
            <button className="btn-primary">Inherit implemented controls</button>
          </form>
        </div>
      )}

      {/* Per-family coverage */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3 text-sm font-semibold text-ink-700">
          Coverage by family — select a family to close gaps
        </div>
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              <th className="th">Family</th><th className="th">Baseline</th>
              <th className="th">Documented</th><th className="th">Implemented</th>
              <th className="th">Gaps</th><th className="th">Coverage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {data.families.map((f) => {
              const cov = f.baseline ? Math.round((f.implemented / f.baseline) * 100) : 0;
              return (
                <tr key={f.family} className={family === f.family ? "bg-ink-50" : "hover:bg-ink-50"}>
                  <td className="td">
                    <Link href={`/systems/${data.system.id}/coverage?family=${f.family}`} className="font-mono font-semibold text-ink-900 hover:underline">
                      {f.family}
                    </Link>
                    <span className="ml-2 text-xs text-ink-400">{familyName(f.family)}</span>
                  </td>
                  <td className="td">{f.baseline}</td>
                  <td className="td">{f.documented}</td>
                  <td className="td text-green-700">{f.implemented}</td>
                  <td className={"td " + (f.gaps ? "text-red-600" : "text-ink-400")}>{f.gaps}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded bg-ink-100">
                        <div className="h-2 rounded bg-green-500" style={{ width: `${cov}%` }} />
                      </div>
                      <span className="text-xs text-ink-500">{cov}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Family drill-down with inline documentation */}
      {family && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50 px-5 py-3">
            <span className="text-sm font-semibold text-ink-700">
              {family} — {familyName(family)} ({familyControls.length} baseline controls)
            </span>
            <Link href={`/systems/${data.system.id}/coverage`} className="text-xs text-ink-500 hover:underline">Clear</Link>
          </div>
          <table className="w-full">
            <thead className="border-b border-ink-200">
              <tr>
                <th className="th">Control</th><th className="th">Status</th>
                <th className="th">Implementation narrative</th>
                {canDoc && <th className="th">Document</th>}
                {canPoam && <th className="th">Gap POA&M</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {familyControls.map((c) => (
                <tr key={c.id} className={c.status ? "" : "bg-red-50/40"}>
                  <td className="td whitespace-nowrap font-mono text-xs">
                    <Link href={`/controls/${encodeURIComponent(c.id)}`} className="font-semibold text-ink-900 hover:underline">{c.id}</Link>
                    <div className="text-[11px] font-normal text-ink-400">{c.title}</div>
                  </td>
                  <td className={"td text-xs font-medium " + (c.status ? STATUS_CLS[c.status] : "text-red-600")}>
                    {c.status ? c.status.replace(/_/g, " ") : "Not documented"}
                  </td>
                  <td className="td max-w-sm text-xs text-ink-600">{c.narrative ?? "—"}</td>
                  {canDoc && (
                    <td className="td">
                      <form action={documentControlAction} className="flex items-start gap-1">
                        <input type="hidden" name="systemId" value={data.system.id} />
                        <input type="hidden" name="controlId" value={c.id} />
                        <select name="status" defaultValue={c.status ?? "PLANNED"} className="input w-36 py-1 text-xs">
                          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                        </select>
                        <textarea name="narrative" defaultValue={c.narrative ?? ""} rows={1} placeholder="Narrative…" className="input w-48 py-1 text-xs" />
                        <button className="btn-primary px-2 py-1 text-xs">Save</button>
                      </form>
                    </td>
                  )}
                  {canPoam && (
                    <td className="td">
                      {!IMPLEMENTED.includes(c.status ?? "") ? (
                        <form action={createControlPoamAction}>
                          <input type="hidden" name="systemId" value={data.system.id} />
                          <input type="hidden" name="controlId" value={c.id} />
                          <button className="whitespace-nowrap text-xs font-medium text-blue-700 hover:underline">
                            + POA&amp;M
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-ink-300">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${accent ?? "text-ink-900"}`}>{value}</div>
    </div>
  );
}
