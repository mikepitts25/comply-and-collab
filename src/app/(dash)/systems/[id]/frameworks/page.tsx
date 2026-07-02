import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { assessFramework, FRAMEWORKS, type RequirementStatus } from "@/lib/frameworks";
import { Download } from "lucide-react";
import clsx from "clsx";

export const dynamic = "force-dynamic";

const STATUS_META: Record<RequirementStatus, { label: string; cls: string }> = {
  MET: { label: "Met", cls: "bg-green-100 text-green-800" },
  PARTIAL: { label: "Partial", cls: "bg-orange-50 text-orange-700 ring-1 ring-orange-200" },
  PLANNED: { label: "Planned", cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  NOT_MET: { label: "Not Met", cls: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  NOT_APPLICABLE: { label: "N/A", cls: "bg-ink-100 text-ink-600" },
};

const CTRL_STATUS_CLS: Record<string, string> = {
  IMPLEMENTED: "bg-green-100 text-green-800",
  INHERITED: "bg-purple-100 text-purple-700",
  PARTIALLY_IMPLEMENTED: "bg-orange-50 text-orange-700",
  PLANNED: "bg-blue-50 text-blue-700",
  NOT_IMPLEMENTED: "bg-red-50 text-red-700",
  NOT_APPLICABLE: "bg-ink-100 text-ink-600",
  UNDOCUMENTED: "bg-ink-50 text-ink-400 ring-1 ring-ink-200",
};

function StatusBadge({ value }: { value: RequirementStatus }) {
  const m = STATUS_META[value];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

function pct(met: number, total: number) {
  return total === 0 ? 0 : Math.round((met / total) * 100);
}

export default async function FrameworksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fw?: string }>;
}) {
  const { id } = await params;
  const { fw } = await searchParams;
  const frameworkKey = fw && FRAMEWORKS[fw] ? fw : Object.keys(FRAMEWORKS)[0];

  const system = await prisma.system.findUnique({
    where: { id },
    select: { id: true, name: true, acronym: true },
  });
  if (!system) notFound();

  const a = await assessFramework(system.id, frameworkKey);
  if (!a) notFound();

  return (
    <div className="space-y-6">
      <Link href={`/systems/${system.id}`} className="text-sm text-ink-500 hover:underline">
        ← Back to {system.acronym}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Framework Crosswalk</h1>
          <p className="text-sm text-ink-500">
            {system.acronym} — posture against commercial &amp; international frameworks,
            derived from documented 800-53 controls. No separate data entry.
          </p>
        </div>
        <a
          href={`/api/export/framework?system=${system.id}&fw=${a.framework.key}`}
          className="btn-ghost"
          download
          title="Export this framework assessment as CSV"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>

      {/* Framework switcher */}
      <div className="flex flex-wrap items-center gap-2">
        {Object.values(FRAMEWORKS).map((f) => (
          <Link
            key={f.key}
            href={`/systems/${system.id}/frameworks?fw=${f.key}`}
            className={clsx(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              f.key === a.framework.key
                ? "bg-ink-900 text-white"
                : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            )}
          >
            {f.shortName}
          </Link>
        ))}
        <Link
          href={`/systems/${system.id}/cmmc`}
          className="rounded-md bg-ink-100 px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-200"
        >
          CMMC 2.0
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            {a.framework.name}
          </div>
          <div className="mt-1 text-3xl font-semibold text-ink-900">
            {a.met}
            <span className="text-lg text-ink-400"> / {a.total}</span>
          </div>
          <div className="mt-1 text-xs text-ink-500">
            {pct(a.met, a.total)}% of {a.framework.unitLabel}s met
          </div>
        </div>
        <div className="card p-5 sm:col-span-2">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
            Breakdown
          </div>
          <div className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
            {(Object.keys(STATUS_META) as RequirementStatus[]).map((s) => (
              <div key={s} className="flex items-center justify-between pr-4">
                <StatusBadge value={s} />
                <span className="font-medium text-ink-900">{a.byStatus[s]}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-400">{a.framework.description}</p>
        </div>
      </div>

      {/* Groups */}
      {a.groups.map((g) => (
        <div key={g.key} className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50 px-5 py-2">
            <div className="text-sm font-semibold text-ink-700">
              {g.key === g.name ? g.name : `${g.key} — ${g.name}`}
            </div>
            <div className="text-xs text-ink-500">
              {g.met}/{g.total} met ({pct(g.met, g.total)}%)
            </div>
          </div>
          <table className="w-full">
            <thead className="border-b border-ink-200">
              <tr>
                <th className="th w-20">Ref</th>
                <th className="th">Requirement</th>
                <th className="th">Mapped 800-53</th>
                <th className="th w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {g.requirements.map((r) => (
                <tr key={r.id} className="align-top hover:bg-ink-50">
                  <td className="td font-mono text-xs">
                    {r.id}
                    {r.tier && (
                      <span className="ml-1 rounded bg-ink-100 px-1 py-0.5 text-[10px] font-semibold text-ink-600">
                        {r.tier}
                      </span>
                    )}
                  </td>
                  <td className="td max-w-md text-xs text-ink-700">{r.text}</td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1">
                      {r.controlStatuses.map((c) => (
                        <Link
                          key={c.controlId}
                          href={`/controls/${c.controlId}`}
                          className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${CTRL_STATUS_CLS[c.status] ?? "bg-ink-100 text-ink-700"}`}
                          title={c.status.replace(/_/g, " ")}
                        >
                          {c.controlId}
                        </Link>
                      ))}
                    </div>
                  </td>
                  <td className="td">
                    <StatusBadge value={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <p className="text-xs text-ink-400">
        Crosswalk mappings are primary mappings (NIST OLIR practice); refine per your
        assessment scope. Statuses derive from this system&apos;s documented 800-53
        implementation (Controls / SSP).
      </p>
    </div>
  );
}
