import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ControlsPage() {
  const controls = await prisma.control.findMany({
    orderBy: [{ family: "asc" }, { id: "asc" }],
    include: {
      _count: { select: { findingLinks: true, poamLinks: true } },
    },
  });

  // Group by family
  const families = new Map<string, typeof controls>();
  for (const c of controls) {
    (families.get(c.family) ?? families.set(c.family, []).get(c.family)!).push(c);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Control Catalog</h1>
        <p className="text-sm text-ink-500">
          NIST SP 800-53 controls with baseline membership and live finding linkage.
        </p>
      </div>

      {[...families.entries()].map(([family, ctrls]) => (
        <div key={family} className="card overflow-hidden">
          <div className="border-b border-ink-200 bg-ink-50 px-5 py-2 text-sm font-semibold text-ink-700">
            {family} — {ctrls.length} control(s)
          </div>
          <table className="w-full">
            <thead className="border-b border-ink-200">
              <tr>
                <th className="th">Control</th>
                <th className="th">Title</th>
                <th className="th">Baselines</th>
                <th className="th">Findings</th>
                <th className="th">POA&Ms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {ctrls.map((c) => (
                <tr key={c.id} className="hover:bg-ink-50">
                  <td className="td font-mono text-xs">
                    <Link href={`/controls/${c.id}`} className="font-semibold text-ink-900 hover:underline">
                      {c.id}
                    </Link>
                  </td>
                  <td className="td">{c.title}</td>
                  <td className="td">
                    <div className="flex gap-1">
                      {c.baselineLow && <Base label="L" />}
                      {c.baselineModerate && <Base label="M" />}
                      {c.baselineHigh && <Base label="H" />}
                    </div>
                  </td>
                  <td className="td">{c._count.findingLinks}</td>
                  <td className="td">{c._count.poamLinks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function Base({ label }: { label: string }) {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-ink-100 text-[11px] font-semibold text-ink-700">
      {label}
    </span>
  );
}
