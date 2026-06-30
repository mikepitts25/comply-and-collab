import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { familyName } from "@/lib/data/families";
import { CatalogLoader } from "./catalog-loader";

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };

export default async function ControlsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const family = typeof sp.family === "string" ? sp.family.toUpperCase() : undefined;
  const user = await getSessionUser();

  const [controlCount, cciAgg, byFamily] = await Promise.all([
    prisma.control.count(),
    prisma.cci.aggregate({ _count: { _all: true } }),
    prisma.control.groupBy({ by: ["family"], _count: { _all: true } }),
  ]);
  const mappedCcis = await prisma.cci.count({ where: { controlId: { not: null } } });

  const familyCounts = new Map(byFamily.map((f) => [f.family, f._count._all]));
  const families = [...familyCounts.keys()].sort();

  // Drill-down: controls for the selected family.
  const controls = family
    ? await prisma.control.findMany({
        where: { family },
        orderBy: { id: "asc" },
        include: { _count: { select: { findingLinks: true, poamLinks: true } } },
      })
    : [];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Control Catalog</h1>
          <p className="text-sm text-ink-500">
            NIST SP 800-53 Rev 5 — {controlCount.toLocaleString()} controls,{" "}
            {cciAgg._count._all.toLocaleString()} CCIs ({mappedCcis.toLocaleString()} mapped).
          </p>
        </div>
        {user?.role === "ADMIN" && <CatalogLoader />}
      </div>

      {/* Family overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {families.map((f) => {
          const active = family === f;
          return (
            <Link
              key={f}
              href={active ? "/controls" : `/controls?family=${f}`}
              className={
                "card p-4 transition-shadow hover:shadow-md " +
                (active ? "ring-2 ring-ink-900" : "")
              }
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-lg font-semibold text-ink-900">{f}</span>
                <span className="text-sm text-ink-500">{familyCounts.get(f)}</span>
              </div>
              <div className="mt-1 text-xs text-ink-500">{familyName(f)}</div>
            </Link>
          );
        })}
      </div>

      {/* Selected family table */}
      {family && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50 px-5 py-3">
            <span className="text-sm font-semibold text-ink-700">
              {family} — {familyName(family)} ({controls.length})
            </span>
            <Link href="/controls" className="text-xs text-ink-500 hover:underline">
              Clear
            </Link>
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
              {controls.map((c) => (
                <tr key={c.id} className="hover:bg-ink-50">
                  <td className="td whitespace-nowrap font-mono text-xs">
                    <Link href={`/controls/${encodeURIComponent(c.id)}`} className="font-semibold text-ink-900 hover:underline">
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
                  <td className="td">{c._count.findingLinks || ""}</td>
                  <td className="td">{c._count.poamLinks || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!family && (
        <p className="text-sm text-ink-500">
          Select a family to browse its controls and enhancements.
        </p>
      )}
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
