import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { createMitigationAction } from "@/app/actions/mitigations";
import { CreateMitigation } from "./create-mitigation";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function MitigationsPage() {
  const [mitigations, controls] = await Promise.all([
    prisma.mitigationStatement.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        author: true,
        controlLinks: true,
        _count: { select: { poams: true } },
      },
    }),
    prisma.control.findMany({ orderBy: { id: "asc" }, select: { id: true, title: true } }),
  ]);
  const user = await getSessionUser();
  const canCreate = user ? can(user.role, "mitigation:create") : false;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Mitigation Library</h1>
          <p className="text-sm text-ink-500">
            Reusable mitigation &amp; remediation statements, mapped to controls and POA&Ms.
          </p>
        </div>
        {canCreate && (
          <CreateMitigation controls={controls} action={createMitigationAction} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {mitigations.map((m) => (
          <div key={m.id} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-ink-900">{m.title}</h2>
              {m.approved ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                  Approved
                </span>
              ) : (
                <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-semibold text-yellow-700 ring-1 ring-yellow-200">
                  Draft
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-ink-700">{m.body}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1">
              {m.controlLinks.map((cl) => (
                <span key={cl.controlId} className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[11px] text-ink-700">
                  {cl.controlId}
                </span>
              ))}
              {m.tags.map((t) => (
                <span key={t} className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                  #{t}
                </span>
              ))}
            </div>
            <div className="mt-3 text-xs text-ink-500">
              {m.author?.name ?? "Unknown"} · {fmtDate(m.updatedAt)} · used in {m._count.poams} POA&M(s)
            </div>
          </div>
        ))}
        {mitigations.length === 0 && (
          <p className="text-sm text-ink-500">No mitigation statements yet.</p>
        )}
      </div>
    </div>
  );
}
