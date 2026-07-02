import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { assessCmmc, type RequirementStatus } from "@/lib/cmmc";
import { CMMC_L1_COUNT, CMMC_TOTAL } from "@/lib/data/cmmc-800-171";
import { Download } from "lucide-react";

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
  UNDOCUMENTED: "bg-ink-50 text-ink-500 ring-1 ring-ink-200",
};

function StatusBadge({ value }: { value: RequirementStatus }) {
  const m = STATUS_META[value];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${m.cls}`}>{m.label}</span>;
}

function pct(met: number, total: number) {
  return total === 0 ? 0 : Math.round((met / total) * 100);
}

export default async function CmmcPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const system = await prisma.system.findUnique({ where: { id }, select: { id: true, name: true, acronym: true } });
  if (!system) notFound();

  const a = await assessCmmc(system.id);

  return (
    <div className="space-y-6">
      <Link href={`/systems/${system.id}`} className="text-sm text-ink-500 hover:underline">
        ← Back to {system.acronym}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">CMMC 2.0 Assessment</h1>
          <p className="text-sm text-ink-500">
            {system.acronym} — NIST SP 800-171 Rev 2, derived from documented 800-53 control implementation.
          </p>
        </div>
        <a
          href={`/api/export/cmmc?system=${system.id}`}
          className="btn-ghost"
          download
          title="Export the CMMC/800-171 assessment as CSV"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>

      {/* Level summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Level 1 (Foundational · FCI)
          </div>
          <div className="mt-1 text-3xl font-semibold text-ink-900">
            {a.level1.met}
            <span className="text-lg text-ink-500"> / {a.level1.total}</span>
          </div>
          <div className="mt-1 text-xs text-ink-500">{pct(a.level1.met, a.level1.total)}% of the {CMMC_L1_COUNT} L1 practices met</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Level 2 (Advanced · CUI)
          </div>
          <div className="mt-1 text-3xl font-semibold text-ink-900">
            {a.level2.met}
            <span className="text-lg text-ink-500"> / {a.level2.total}</span>
          </div>
          <div className="mt-1 text-xs text-ink-500">{pct(a.level2.met, a.level2.total)}% of all {CMMC_TOTAL} requirements met</div>
        </div>
        <div className="card p-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Breakdown</div>
          <div className="space-y-1 text-sm">
            {(Object.keys(STATUS_META) as RequirementStatus[]).map((s) => (
              <div key={s} className="flex items-center justify-between">
                <StatusBadge value={s} />
                <span className="font-medium text-ink-900">{a.byStatus[s]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Families */}
      {a.families.map((fam) => (
        <div key={fam.key} className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50 px-5 py-2">
            <div className="text-sm font-semibold text-ink-700">
              {fam.key} — {fam.name}
            </div>
            <div className="text-xs text-ink-500">
              {fam.met}/{fam.total} met ({pct(fam.met, fam.total)}%)
            </div>
          </div>
          <table className="w-full">
            <thead className="border-b border-ink-200">
              <tr>
                <th className="th w-16">Req</th>
                <th className="th w-14">Level</th>
                <th className="th">Requirement</th>
                <th className="th">Mapped 800-53</th>
                <th className="th w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {fam.requirements.map((r) => (
                <tr key={r.id} className="align-top hover:bg-ink-50">
                  <td className="td font-mono text-xs">{r.id}</td>
                  <td className="td">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${r.level === 1 ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600"}`}>
                      L{r.level}
                    </span>
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
                  <td className="td"><StatusBadge value={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <p className="text-xs text-ink-500">
        Requirement statuses are derived from this system&apos;s documented 800-53 control implementation
        (Controls / SSP). Mappings follow NIST SP 800-171 Rev 2 Table D; refine per your assessment scope.
      </p>
    </div>
  );
}
