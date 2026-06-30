import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SeverityBadge, FindingStatusBadge } from "@/components/badges";

export const dynamic = "force-dynamic";

export default async function ControlDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const control = await prisma.control.findUnique({
    where: { id: decodeURIComponent(id) },
    include: {
      ccis: true,
      findingLinks: {
        include: { finding: { include: { system: true, asset: true } } },
      },
      systemControls: { include: { system: true } },
      mitigationLinks: { include: { mitigation: true } },
    },
  });
  if (!control) notFound();

  return (
    <div className="space-y-5">
      <Link href="/controls" className="text-sm text-ink-500 hover:underline">
        ← Back to catalog
      </Link>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold text-ink-900">{control.id}</h1>
          <div className="flex gap-1">
            {control.baselineLow && <Base label="Low" />}
            {control.baselineModerate && <Base label="Mod" />}
            {control.baselineHigh && <Base label="High" />}
          </div>
        </div>
        <p className="mt-1 text-lg text-ink-700">{control.title}</p>
      </div>

      {control.text && (
        <div className="card p-5">
          <p className="text-sm text-ink-800">{control.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="border-b border-ink-200 px-5 py-3 text-sm font-semibold text-ink-700">
              Related findings ({control.findingLinks.length})
            </div>
            <table className="w-full">
              <thead className="border-b border-ink-200 bg-ink-50">
                <tr>
                  <th className="th">Severity</th>
                  <th className="th">Finding</th>
                  <th className="th">System</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {control.findingLinks.map(({ finding: f }) => (
                  <tr key={f.id} className="hover:bg-ink-50">
                    <td className="td"><SeverityBadge value={f.severity} /></td>
                    <td className="td">
                      <Link href={`/findings/${f.id}`} className="text-ink-900 hover:underline">
                        {f.title}
                      </Link>
                      <span className="ml-2 text-xs text-ink-400">{f.asset?.hostname}</span>
                    </td>
                    <td className="td text-xs">{f.system.acronym}</td>
                    <td className="td"><FindingStatusBadge value={f.status} /></td>
                  </tr>
                ))}
                {control.findingLinks.length === 0 && (
                  <tr><td className="td text-ink-500" colSpan={4}>No findings mapped to this control.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-2 text-sm font-semibold text-ink-700">CCIs</h2>
            <ul className="space-y-2">
              {control.ccis.map((c) => (
                <li key={c.id}>
                  <span className="font-mono text-xs text-blue-700">{c.id}</span>
                  <p className="text-xs text-ink-600">{c.definition}</p>
                </li>
              ))}
              {control.ccis.length === 0 && <li className="text-xs text-ink-400">None.</li>}
            </ul>
          </div>

          <div className="card p-5">
            <h2 className="mb-2 text-sm font-semibold text-ink-700">Implementation by system</h2>
            <ul className="space-y-1">
              {control.systemControls.map((sc) => (
                <li key={sc.id} className="flex justify-between text-sm">
                  <Link href={`/systems/${sc.systemId}`} className="text-ink-800 hover:underline">
                    {sc.system.acronym}
                  </Link>
                  <span className="text-xs text-ink-500">{sc.status.replace(/_/g, " ")}</span>
                </li>
              ))}
              {control.systemControls.length === 0 && (
                <li className="text-xs text-ink-400">Not yet documented.</li>
              )}
            </ul>
          </div>

          {control.mitigationLinks.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-2 text-sm font-semibold text-ink-700">Reusable mitigations</h2>
              <ul className="space-y-1">
                {control.mitigationLinks.map((ml) => (
                  <li key={ml.mitigation.id} className="text-sm text-ink-800">
                    {ml.mitigation.title}
                    {ml.mitigation.approved && <span className="ml-1 text-green-600">✓</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Base({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded bg-ink-100 px-1.5 py-0.5 text-[11px] font-semibold text-ink-700">
      {label}
    </span>
  );
}
