import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fmtDate, daysUntil } from "@/lib/format";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import {
  createInterconnectionAction,
  updateInterconnectionStatusAction,
  deleteInterconnectionAction,
} from "@/app/actions/interconnections";

export const dynamic = "force-dynamic";

const STATUS_CLS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PENDING_APPROVAL: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  PLANNED: "bg-ink-100 text-ink-600",
  EXPIRED: "bg-red-50 text-red-700 ring-1 ring-red-200",
  TERMINATED: "bg-ink-200 text-ink-700",
};

export default async function InterconnectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const system = await prisma.system.findUnique({
    where: { id },
    select: {
      id: true,
      acronym: true,
      name: true,
      interconnections: { orderBy: [{ status: "asc" }, { remoteName: "asc" }] },
    },
  });
  if (!system) notFound();

  const user = await getSessionUser();
  const canManage = user ? can(user.role, "system:manage") : false;

  return (
    <div className="space-y-6">
      <Link href={`/systems/${system.id}`} className="text-sm text-ink-500 hover:underline">
        ← Back to {system.acronym}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-ink-900">System Interconnections</h1>
        <p className="text-sm text-ink-500">
          {system.acronym} — documented external connections and their agreements
          (ISA/MOU/MOA), per CA-3 information exchange.
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              <th className="th">Remote system</th>
              <th className="th">Connection</th>
              <th className="th">Direction</th>
              <th className="th">Data / class.</th>
              <th className="th">Agreement</th>
              <th className="th">Expires</th>
              <th className="th">Status</th>
              {canManage && <th className="th">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {system.interconnections.map((ic) => {
              const d = daysUntil(ic.expiresAt);
              return (
                <tr key={ic.id} className="align-top hover:bg-ink-50">
                  <td className="td">
                    <div className="font-medium text-ink-900">{ic.remoteName}</div>
                    {ic.remoteOwner && <div className="text-xs text-ink-500">{ic.remoteOwner}</div>}
                  </td>
                  <td className="td text-xs">{ic.connectionType}</td>
                  <td className="td text-xs">{ic.direction}</td>
                  <td className="td max-w-xs text-xs text-ink-600">
                    {ic.dataDescription ?? "—"}
                    {ic.classification && (
                      <span className="ml-1 rounded bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-700">
                        {ic.classification}
                      </span>
                    )}
                  </td>
                  <td className="td text-xs">
                    {ic.agreementType} · {fmtDate(ic.agreementDate)}
                  </td>
                  <td className="td text-xs">
                    {fmtDate(ic.expiresAt)}
                    {d !== null && d < 90 && (
                      <span className={d < 0 ? " font-medium text-red-600" : " text-orange-600"}>
                        {" "}({d}d)
                      </span>
                    )}
                  </td>
                  <td className="td">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[ic.status]}`}>
                      {ic.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  {canManage && (
                    <td className="td">
                      <div className="flex items-center gap-1">
                        <form action={updateInterconnectionStatusAction}>
                          <input type="hidden" name="id" value={ic.id} />
                          <input type="hidden" name="systemId" value={system.id} />
                          <select
                            name="status"
                            aria-label="Interconnection status"
                            defaultValue={ic.status}
                            className="input w-36 py-1 text-xs"
                          >
                            {Object.keys(STATUS_CLS).map((s) => (
                              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                            ))}
                          </select>
                          <button className="btn-ghost mt-1 w-full py-0.5 text-xs">Set</button>
                        </form>
                        <form action={deleteInterconnectionAction}>
                          <input type="hidden" name="id" value={ic.id} />
                          <input type="hidden" name="systemId" value={system.id} />
                          <button className="btn-ghost py-0.5 text-xs text-red-600" title="Delete" aria-label="Delete interconnection">✕</button>
                        </form>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {system.interconnections.length === 0 && (
              <tr>
                <td className="td text-ink-500" colSpan={canManage ? 8 : 7}>
                  No interconnections documented.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canManage && (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink-700">Document interconnection</h2>
          <form action={createInterconnectionAction} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input type="hidden" name="systemId" value={system.id} />
            <input name="remoteName" placeholder="Remote system name" className="input" required />
            <input name="remoteOwner" placeholder="Owning org / POC" className="input" />
            <input name="connectionType" placeholder="Connection (e.g. IPsec VPN)" className="input" required />
            <select name="direction" className="input" defaultValue="BIDIRECTIONAL">
              <option value="INBOUND">Inbound</option>
              <option value="OUTBOUND">Outbound</option>
              <option value="BIDIRECTIONAL">Bidirectional</option>
            </select>
            <select name="agreementType" className="input" defaultValue="ISA">
              {["ISA", "MOU", "MOA", "SLA", "OTHER"].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select name="status" className="input" defaultValue="PENDING_APPROVAL">
              {Object.keys(STATUS_CLS).map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
            <input name="classification" placeholder="Class (CUI…)" className="input" />
            <label className="text-xs text-ink-500">
              Agreement date
              <input type="date" name="agreementDate" className="input mt-1" />
            </label>
            <label className="text-xs text-ink-500">
              Expires
              <input type="date" name="expiresAt" className="input mt-1" />
            </label>
            <textarea name="dataDescription" rows={2} placeholder="Data exchanged…" className="input sm:col-span-2" />
            <textarea name="notes" rows={2} placeholder="Notes…" className="input" />
            <button className="btn-primary sm:col-span-3">Add interconnection</button>
          </form>
        </div>
      )}
    </div>
  );
}
