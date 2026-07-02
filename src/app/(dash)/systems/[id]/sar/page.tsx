import Link from "next/link";
import { notFound } from "next/navigation";
import { gatherSar } from "@/lib/sar";
import { fmtDate } from "@/lib/format";
import { ImpactBadge, SeverityBadge } from "@/components/badges";
import { PrintButton } from "@/components/print-button";
import { Download } from "lucide-react";
import type { ImpactLevel } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function SarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await gatherSar(id);
  if (!d) notFound();
  const s = d.system;
  const sev = (x: string) => d.openBySev.find((y) => y.severity === x)?._count ?? 0;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/systems/${s.id}`} className="text-sm text-ink-500 hover:underline">← Back to system</Link>
        <div className="flex items-center gap-2">
          <a href={`/api/export/sar?system=${s.id}`} className="btn-ghost" download>
            <Download className="h-4 w-4" /> Markdown
          </a>
          <PrintButton />
        </div>
      </div>

      <article className="card space-y-8 p-10 text-sm leading-relaxed text-ink-800 print:border-0 print:shadow-none">
        <header className="border-b border-ink-200 pb-5">
          <p className="text-xs uppercase tracking-widest text-ink-500">Security Assessment Report</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-900">{s.name} <span className="text-ink-500">({s.acronym})</span></h1>
          <p className="mt-1 text-xs text-ink-500">Generated {fmtDate(d.generatedAt)} · Comply &amp; Collab · For Official Use Only</p>
        </header>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900">1. Executive Summary</h2>
          <div className="grid grid-cols-2 gap-3">
            <Fact label="Categorization"><ImpactBadge value={s.categorization} /></Fact>
            <Fact label="Overall residual risk"><ImpactBadge value={d.riskLevel as ImpactLevel} /></Fact>
            <Fact label="Authorization">{s.authorizationStatus.replace(/_/g, " ")}</Fact>
            <Fact label="Last assessment (scan)">{fmtDate(d.lastScanAt)}</Fact>
            <Fact label="Open findings">{d.totalOpen} (Crit {d.openCrit}, High {d.openHigh})</Fact>
            <Fact label="Active POA&Ms">{d.totalPoams}</Fact>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900">2. Assessment Scope</h2>
          <p className="mb-2 text-ink-600">Evaluated using the following imported assessment sources:</p>
          <ul className="list-inside list-disc">
            {d.scansByType.map((x) => <li key={x.type}>{x.type} — {x._count} import(s)</li>)}
            {d.scansByType.length === 0 && <li>No scans imported.</li>}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900">3. Findings Summary</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((x) => (
              <div key={x} className="rounded-md border border-ink-200 p-3 text-center">
                <div className="text-2xl font-semibold text-ink-900">{sev(x)}</div>
                <SeverityBadge value={x} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-500">{d.closed} finding(s) closed to date. Open by source: {d.openBySource.map((x) => `${x.source} ${x._count}`).join(", ") || "none"}.</p>
        </section>

        {d.coverage && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-ink-900">4. Control Assessment Results</h2>
            <p>{s.categorization} baseline: <strong>{d.coverage.totals.baseline}</strong> controls · Implemented <strong>{d.coverage.totals.implemented}</strong> · Gaps <strong className="text-red-600">{d.coverage.totals.gaps}</strong>.</p>
            <Link href={`/systems/${s.id}/coverage`} className="text-xs text-ink-900 underline print:hidden">View full coverage →</Link>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900">5. Risk Assessment</h2>
          <p>
            Based on {d.openCrit} critical and {d.openHigh} high open findings and {d.coverage?.totals.gaps ?? 0} control
            gaps, the assessed residual risk is <strong>{d.riskLevel}</strong>. {d.totalPoams} POA&amp;M(s) track remediation
            of the identified weaknesses.
          </p>
        </section>
      </article>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-ink-200 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-1 text-ink-900">{children}</div>
    </div>
  );
}
