import Link from "next/link";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SP = { [k: string]: string | string[] | undefined };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const entity = typeof sp.entity === "string" ? sp.entity : undefined;
  const actorId = typeof sp.actor === "string" ? sp.actor : undefined;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const where: Prisma.ActivityWhereInput = {};
  if (entity) where.entity = entity;
  if (actorId) where.actorId = actorId;

  const [activities, total, entities, actors] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: true },
    }),
    prisma.activity.count({ where }),
    prisma.activity.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const q = (o: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { entity, actor: actorId, ...o };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    return `/audit?${params.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Audit Log</h1>
          <p className="text-sm text-ink-500">
            Immutable trail of every action — imports, triage, POA&M changes,
            catalog loads, sign-ins, and key management.
          </p>
        </div>
        <span className="text-sm text-ink-500">{total.toLocaleString()} events</span>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <span className="px-1 text-xs font-semibold uppercase text-ink-400">Entity:</span>
        <Chip href={q({ entity: undefined, page: undefined })} active={!entity}>All</Chip>
        {entities.map((e) => (
          <Chip key={e.entity} href={q({ entity: e.entity, page: undefined })} active={entity === e.entity}>
            {e.entity}
          </Chip>
        ))}
        <span className="ml-4 px-1 text-xs font-semibold uppercase text-ink-400">Actor:</span>
        <form action="/audit" className="inline">
          {entity && <input type="hidden" name="entity" value={entity} />}
          <select name="actor" defaultValue={actorId ?? ""} className="input inline w-44 py-1">
            <option value="">Anyone</option>
            {actors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              <th className="th">When</th><th className="th">Actor</th>
              <th className="th">Action</th><th className="th">Entity</th>
              <th className="th">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {activities.map((a) => (
              <tr key={a.id} className="hover:bg-ink-50">
                <td className="td whitespace-nowrap text-xs text-ink-500">{fmtDate(a.createdAt)}</td>
                <td className="td text-xs">{a.actor?.name ?? "system"}</td>
                <td className="td text-xs font-medium">{a.verb}</td>
                <td className="td text-xs">{a.entity}</td>
                <td className="td text-sm text-ink-800">{a.summary}</td>
              </tr>
            ))}
            {activities.length === 0 && (
              <tr><td className="td text-ink-500" colSpan={5}>No matching events.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-500">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={q({ page: String(page - 1) })} className="btn-ghost">Previous</Link>}
            {page < pages && <Link href={q({ page: String(page + 1) })} className="btn-ghost">Next</Link>}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={"rounded px-2 py-1 text-xs font-medium " + (active ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200")}
    >
      {children}
    </Link>
  );
}
