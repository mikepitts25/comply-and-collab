import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AtoBadge, ImpactBadge, SeverityBadge } from "@/components/badges";
import { fmtDate, daysUntil } from "@/lib/format";
import { generatePoamsAction } from "@/app/actions/import";
import { frameworkLabel } from "@/lib/data/families";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { ClipboardPlus, FileText, Download, Boxes } from "lucide-react";

export const dynamic = "force-dynamic";

const CTRL_STATUS_CLS: Record<string, string> = {
  IMPLEMENTED: "text-green-700",
  PARTIALLY_IMPLEMENTED: "text-orange-700",
  PLANNED: "text-blue-700",
  NOT_IMPLEMENTED: "text-red-700",
  INHERITED: "text-purple-700",
  NOT_APPLICABLE: "text-ink-500",
};

export default async function SystemDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const system = await prisma.system.findUnique({
    where: { id },
    include: {
      assets: { orderBy: { hostname: "asc" }, include: { _count: { select: { findings: true } } } },
      controls: { include: { control: true }, orderBy: { controlId: "asc" } },
      findings: { where: { status: "OPEN" }, select: { severity: true } },
      _count: { select: { poams: true, findings: true } },
    },
  });
  if (!system) notFound();

  const user = await getSessionUser();
  const canGenerate = user ? can(user.role, "poam:generate") : false;

  const sevCount = (s: string) => system.findings.filter((f) => f.severity === s).length;
  const d = daysUntil(system.atoExpiration);

  return (
    <div className="space-y-6">
      <Link href="/systems" className="text-sm text-ink-500 hover:underline">
        ← Back to systems
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink-900">
              {system.acronym}
            </h1>
            <AtoBadge value={system.authorizationStatus} />
          </div>
          <p className="text-ink-600">{system.name}</p>
          {system.description && (
            <p className="mt-2 max-w-2xl text-sm text-ink-500">{system.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/systems/${system.id}/inventory`}
            className="btn-ghost"
            title="Hardware, software, and PPSM inventory"
          >
            <Boxes className="h-4 w-4" />
            Inventory
          </a>
          <a
            href={`/systems/${system.id}/ssp`}
            className="btn-ghost"
            title="Generate the System Security Plan document"
          >
            <FileText className="h-4 w-4" />
            SSP
          </a>
          <a
            href={`/api/export/poam?system=${system.id}`}
            className="btn-ghost"
            download
            title="Export this system's POA&Ms as an eMASS-style CSV"
          >
            <Download className="h-4 w-4" />
            POA&M CSV
          </a>
          {canGenerate && (
            <form action={generatePoamsAction}>
              <input type="hidden" name="systemId" value={system.id} />
              <button className="btn-primary" title="Create POA&Ms for open findings without one">
                <ClipboardPlus className="h-4 w-4" />
                Generate POA&Ms
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ATO + categorization */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink-700">Authorization</h2>
          <Row label="Status"><AtoBadge value={system.authorizationStatus} /></Row>
          <Row label="AO">{system.authorizingOfficial ?? "—"}</Row>
          <Row label="ATO date">{fmtDate(system.atoDate)}</Row>
          <Row label="Expires">
            {fmtDate(system.atoExpiration)}
            {d !== null && (
              <span className={d < 90 ? " font-medium text-red-600" : " text-ink-500"}>
                {" "}({d}d)
              </span>
            )}
          </Row>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink-700">Categorization (FIPS 199)</h2>
          <Row label="Overall"><ImpactBadge value={system.categorization} /></Row>
          <Row label="Confidentiality"><ImpactBadge value={system.confidentiality} /></Row>
          <Row label="Integrity"><ImpactBadge value={system.integrity} /></Row>
          <Row label="Availability"><ImpactBadge value={system.availability} /></Row>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink-700">Open findings</h2>
          <div className="grid grid-cols-2 gap-2">
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((s) => (
              <div key={s} className="rounded-md bg-ink-50 p-2 text-center">
                <div className="text-xl font-semibold text-ink-900">{sevCount(s)}</div>
                <SeverityBadge value={s} />
              </div>
            ))}
          </div>
          <Link href={`/findings?system=${system.id}`} className="mt-3 block text-sm text-ink-900 underline">
            View all findings →
          </Link>
        </div>
      </div>

      {/* Frameworks */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase text-ink-400">Frameworks:</span>
        {system.frameworks.map((f) => (
          <span key={f} className="rounded bg-ink-100 px-2 py-0.5 text-xs text-ink-700">
            {frameworkLabel(f)}
          </span>
        ))}
      </div>

      {/* Assets */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3 text-sm font-semibold text-ink-700">
          Asset inventory ({system.assets.length})
        </div>
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              <th className="th">Hostname</th>
              <th className="th">IP</th>
              <th className="th">OS</th>
              <th className="th">Type</th>
              <th className="th">Findings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {system.assets.map((a) => (
              <tr key={a.id}>
                <td className="td font-medium">{a.hostname}</td>
                <td className="td text-xs">{a.ipAddress ?? "—"}</td>
                <td className="td text-xs">{a.osName ?? "—"}</td>
                <td className="td text-xs">{a.type}</td>
                <td className="td">{a._count.findings}</td>
              </tr>
            ))}
            {system.assets.length === 0 && (
              <tr><td className="td text-ink-500" colSpan={5}>No assets discovered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Control implementation (SSP) */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3 text-sm font-semibold text-ink-700">
          Control implementation (SSP) — {system.controls.length} documented
        </div>
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              <th className="th">Control</th>
              <th className="th">Title</th>
              <th className="th">Status</th>
              <th className="th">Narrative</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {system.controls.map((sc) => (
              <tr key={sc.id}>
                <td className="td font-mono text-xs">{sc.controlId}</td>
                <td className="td text-xs">{sc.control.title}</td>
                <td className={`td text-xs font-medium ${CTRL_STATUS_CLS[sc.status] ?? ""}`}>
                  {sc.status.replace(/_/g, " ")}
                </td>
                <td className="td max-w-md text-xs text-ink-600">{sc.narrative ?? "—"}</td>
              </tr>
            ))}
            {system.controls.length === 0 && (
              <tr><td className="td text-ink-500" colSpan={4}>No control narratives documented.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 py-1.5 text-sm last:border-0">
      <span className="text-ink-500">{label}</span>
      <span className="text-ink-900">{children}</span>
    </div>
  );
}
