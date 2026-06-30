import Link from "next/link";
import { notFound } from "next/navigation";
import { gatherSsp } from "@/lib/ssp";
import { fmtDate } from "@/lib/format";
import { familyName, frameworkLabel } from "@/lib/data/families";
import { PrintButton } from "@/components/print-button";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SspPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const d = await gatherSsp(id);
  if (!d) notFound();
  const s = d.system;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Toolbar (hidden on print) */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/systems/${s.id}`} className="text-sm text-ink-500 hover:underline">
          ← Back to system
        </Link>
        <div className="flex items-center gap-2">
          <a href={`/api/export/ssp?system=${s.id}`} className="btn-ghost" download>
            <Download className="h-4 w-4" /> Markdown
          </a>
          <PrintButton />
        </div>
      </div>

      {/* Document */}
      <article className="card space-y-8 p-10 text-sm leading-relaxed text-ink-800 print:border-0 print:shadow-none">
        <header className="border-b border-ink-200 pb-5">
          <p className="text-xs uppercase tracking-widest text-ink-400">
            System Security Plan
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-900">
            {s.name} <span className="text-ink-400">({s.acronym})</span>
          </h1>
          <p className="mt-1 text-xs text-ink-500">
            Generated {fmtDate(d.generatedAt)} · Comply &amp; Collab · For Official Use Only
          </p>
        </header>

        <Section n="1" title="System Identification">
          <DefTable
            rows={[
              ["System Name", s.name],
              ["Acronym", s.acronym],
              ["Description", s.description ?? "—"],
              ["Authorization Status", s.authorizationStatus.replace(/_/g, " ")],
              ["Authorizing Official", s.authorizingOfficial ?? "—"],
              ["ATO Date", fmtDate(s.atoDate)],
              ["ATO Expiration", fmtDate(s.atoExpiration)],
              ["Frameworks", s.frameworks.map(frameworkLabel).join(", ")],
            ]}
          />
        </Section>

        <Section n="2" title="Security Categorization (FIPS 199)">
          <DefTable
            rows={[
              ["Confidentiality", s.confidentiality],
              ["Integrity", s.integrity],
              ["Availability", s.availability],
              ["Overall categorization", s.categorization],
            ]}
          />
        </Section>

        <Section n="3" title="System Environment / Asset Inventory">
          <table className="w-full border border-ink-200 text-xs">
            <thead className="bg-ink-50">
              <tr>
                <Th>Hostname</Th><Th>IP</Th><Th>OS</Th><Th>Type</Th>
              </tr>
            </thead>
            <tbody>
              {s.assets.map((a) => (
                <tr key={a.id} className="border-t border-ink-100">
                  <Td>{a.hostname}</Td><Td>{a.ipAddress ?? "—"}</Td>
                  <Td>{a.osName ?? "—"}</Td><Td>{a.type}</Td>
                </tr>
              ))}
              {s.assets.length === 0 && (
                <tr><Td>—</Td><Td>—</Td><Td>—</Td><Td>—</Td></tr>
              )}
            </tbody>
          </table>
        </Section>

        <Section n="4" title="Control Implementation Summary">
          <p className="mb-4 text-xs text-ink-500">
            Implemented {d.statusCount("IMPLEMENTED")} · Partial{" "}
            {d.statusCount("PARTIALLY_IMPLEMENTED")} · Planned{" "}
            {d.statusCount("PLANNED")} · Inherited {d.statusCount("INHERITED")} ·
            Not Implemented {d.statusCount("NOT_IMPLEMENTED")}
          </p>
          {[...d.byFamily.entries()].map(([fam, controls]) => (
            <div key={fam} className="mb-5">
              <h3 className="mb-2 font-semibold text-ink-900">
                {fam} — {familyName(fam)}
              </h3>
              <div className="space-y-3">
                {controls.map((c) => (
                  <div key={c.id} className="break-inside-avoid border-l-2 border-ink-200 pl-3">
                    <div className="font-medium text-ink-900">
                      <span className="font-mono">{c.controlId}</span> {c.control.title}
                      <span className="ml-2 text-xs font-normal text-ink-500">
                        ({c.status.replace(/_/g, " ")})
                      </span>
                    </div>
                    <p className="mt-1 text-ink-700">
                      {c.narrative ?? "No implementation narrative documented."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {d.byFamily.size === 0 && (
            <p className="text-ink-500">No control narratives documented.</p>
          )}
        </Section>

        <Section n="5" title="Risk Posture">
          <p>
            Open findings — Critical: {d.sevCount("CRITICAL")}, High:{" "}
            {d.sevCount("HIGH")}, Medium: {d.sevCount("MEDIUM")}, Low:{" "}
            {d.sevCount("LOW")}.
          </p>
          <p className="mt-1">Active POA&amp;Ms: {d.openPoams}.</p>
        </Section>
      </article>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid-page">
      <h2 className="mb-3 text-lg font-semibold text-ink-900">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}

function DefTable({ rows }: { rows: [string, string][] }) {
  return (
    <table className="w-full border border-ink-200">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-t border-ink-100 first:border-0">
            <td className="w-56 bg-ink-50 px-3 py-2 text-xs font-semibold text-ink-600">{k}</td>
            <td className="px-3 py-2">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-1.5 text-left font-semibold text-ink-600">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-1.5">{children}</td>;
}
