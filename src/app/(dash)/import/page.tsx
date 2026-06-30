import { prisma } from "@/lib/db";
import { ImportForm } from "./import-form";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const [systems, recent] = await Promise.all([
    prisma.system.findMany({ orderBy: { acronym: "asc" } }),
    prisma.scanImport.findMany({
      orderBy: { importedAt: "desc" },
      take: 10,
      include: { system: true, importedBy: true },
    }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Import Scans</h1>
        <p className="text-sm text-ink-500">
          Ingest ACAS and STIG results. Findings are de-duplicated against
          history and auto-correlated to security controls.
        </p>
      </div>

      <ImportForm systems={systems} />

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink-700">Recent imports</h2>
        <table className="w-full">
          <thead className="border-b border-ink-200">
            <tr>
              <th className="th">File</th>
              <th className="th">Type</th>
              <th className="th">System</th>
              <th className="th">Findings</th>
              <th className="th">By</th>
              <th className="th">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {recent.map((r) => (
              <tr key={r.id}>
                <td className="td font-medium">{r.filename}</td>
                <td className="td text-xs">{r.type}</td>
                <td className="td text-xs">{r.system.acronym}</td>
                <td className="td">
                  {r.totalFindings}{" "}
                  <span className="text-red-600">({r.openFindings} open)</span>
                </td>
                <td className="td text-xs">{r.importedBy.name}</td>
                <td className="td text-xs text-ink-500">{fmtDate(r.importedAt)}</td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td className="td text-ink-500" colSpan={6}>No imports yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
