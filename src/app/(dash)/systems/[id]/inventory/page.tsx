import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fmtDate } from "@/lib/format";
import {
  addSoftwareAction,
  deleteSoftwareAction,
  addPpsmAction,
  deletePpsmAction,
} from "@/app/actions/inventory";
import { Trash2, Download } from "lucide-react";
import type { SoftwareType, Protocol, FlowDirection, PpsmStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const SW_TYPES: SoftwareType[] = ["OPERATING_SYSTEM", "APPLICATION", "DATABASE", "MIDDLEWARE", "DRIVER", "FIRMWARE", "OTHER"];
const PROTOCOLS: Protocol[] = ["TCP", "UDP", "ICMP", "OTHER"];
const DIRECTIONS: FlowDirection[] = ["INBOUND", "OUTBOUND", "BIDIRECTIONAL"];
const PPSM_STATUS: PpsmStatus[] = ["APPROVED", "PENDING", "DENIED"];

const PPSM_STATUS_CLS: Record<PpsmStatus, string> = {
  APPROVED: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  DENIED: "bg-red-100 text-red-800",
};

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const system = await prisma.system.findUnique({
    where: { id },
    include: {
      assets: {
        orderBy: { hostname: "asc" },
        include: { software: { orderBy: { name: "asc" } } },
      },
      ppsm: { orderBy: [{ status: "asc" }, { port: "asc" }] },
    },
  });
  if (!system) notFound();

  const user = await getSessionUser();
  const canManage = user ? can(user.role, "inventory:manage") : false;
  const softwareCount = system.assets.reduce((n, a) => n + a.software.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/systems/${system.id}`} className="text-sm text-ink-500 hover:underline">
          ← Back to {system.acronym}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="mt-1 text-2xl font-semibold text-ink-900">
              Inventory — {system.acronym}
            </h1>
            <p className="text-sm text-ink-500">
              Hardware, software, and PPSM (ports, protocols &amp; services) for the ATO package.
            </p>
          </div>
          <a href={`/api/export/inventory-xlsx?system=${system.id}`} className="btn-ghost" download>
            <Download className="h-4 w-4" /> Export XLSX
          </a>
        </div>
      </div>

      {/* Hardware */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3 text-sm font-semibold text-ink-700">
          Hardware inventory ({system.assets.length})
        </div>
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              <th className="th">Hostname</th><th className="th">IP / MAC</th>
              <th className="th">Make / Model</th><th className="th">Serial</th>
              <th className="th">Location</th><th className="th">Virtual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {system.assets.map((a) => (
              <tr key={a.id}>
                <td className="td font-medium">{a.hostname}<div className="text-[11px] text-ink-400">{a.osName}</div></td>
                <td className="td text-xs">{a.ipAddress ?? "—"}<div className="text-ink-400">{a.macAddress}</div></td>
                <td className="td text-xs">{[a.manufacturer, a.model].filter(Boolean).join(" / ") || "—"}</td>
                <td className="td text-xs">{a.serialNumber ?? "—"}</td>
                <td className="td text-xs">{a.location ?? "—"}</td>
                <td className="td text-xs">{a.virtual ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Software */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3 text-sm font-semibold text-ink-700">
          Software inventory ({softwareCount})
        </div>
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              <th className="th">Software</th><th className="th">Version</th>
              <th className="th">Vendor</th><th className="th">Type</th>
              <th className="th">Asset</th>{canManage && <th className="th" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {system.assets.flatMap((a) =>
              a.software.map((s) => (
                <tr key={s.id}>
                  <td className="td font-medium">{s.name}</td>
                  <td className="td text-xs">{s.version ?? "—"}</td>
                  <td className="td text-xs">{s.vendor ?? "—"}</td>
                  <td className="td text-xs">{s.type.replace(/_/g, " ")}</td>
                  <td className="td text-xs">{a.hostname}</td>
                  {canManage && (
                    <td className="td">
                      <form action={deleteSoftwareAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="systemId" value={system.id} />
                        <button className="text-ink-400 hover:text-red-600" title="Remove">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))
            )}
            {softwareCount === 0 && (
              <tr><td className="td text-ink-500" colSpan={canManage ? 6 : 5}>No software recorded.</td></tr>
            )}
          </tbody>
        </table>
        {canManage && (
          <form action={addSoftwareAction} className="flex flex-wrap items-end gap-2 border-t border-ink-200 bg-ink-50 p-3">
            <select name="assetId" className="input w-40" required defaultValue={system.assets[0]?.id}>
              {system.assets.map((a) => (
                <option key={a.id} value={a.id}>{a.hostname}</option>
              ))}
            </select>
            <input name="name" placeholder="Software name" className="input w-44" required />
            <input name="version" placeholder="Version" className="input w-28" />
            <input name="vendor" placeholder="Vendor" className="input w-32" />
            <select name="type" className="input w-40" defaultValue="APPLICATION">
              {SW_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            <button className="btn-primary">Add software</button>
          </form>
        )}
      </div>

      {/* PPSM */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3 text-sm font-semibold text-ink-700">
          PPSM — Ports, Protocols &amp; Services ({system.ppsm.length})
        </div>
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              <th className="th">Port</th><th className="th">Proto</th>
              <th className="th">Service</th><th className="th">Direction</th>
              <th className="th">Boundary</th><th className="th">Class</th>
              <th className="th">Status</th>{canManage && <th className="th" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {system.ppsm.map((p) => (
              <tr key={p.id}>
                <td className="td font-mono text-xs">{p.port}</td>
                <td className="td text-xs">{p.protocol}</td>
                <td className="td text-xs">{p.service}</td>
                <td className="td text-xs">{p.direction}</td>
                <td className="td text-xs">{p.boundary ?? "—"}</td>
                <td className="td text-xs">{p.classification ?? "—"}</td>
                <td className="td">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${PPSM_STATUS_CLS[p.status]}`}>
                    {p.status[0] + p.status.slice(1).toLowerCase()}
                  </span>
                </td>
                {canManage && (
                  <td className="td">
                    <form action={deletePpsmAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="systemId" value={system.id} />
                      <button className="text-ink-400 hover:text-red-600" title="Remove">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {system.ppsm.length === 0 && (
              <tr><td className="td text-ink-500" colSpan={canManage ? 8 : 7}>No PPSM entries registered.</td></tr>
            )}
          </tbody>
        </table>
        {canManage && (
          <form action={addPpsmAction} className="flex flex-wrap items-end gap-2 border-t border-ink-200 bg-ink-50 p-3">
            <input name="port" placeholder="Port" className="input w-20" required />
            <select name="protocol" className="input w-24" defaultValue="TCP">
              {PROTOCOLS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input name="service" placeholder="Service" className="input w-32" required />
            <select name="direction" className="input w-36" defaultValue="INBOUND">
              {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input name="boundary" placeholder="Boundary" className="input w-40" />
            <input name="classification" placeholder="Class (CUI…)" className="input w-28" />
            <select name="status" className="input w-32" defaultValue="PENDING">
              {PPSM_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn-primary">Add PPSM</button>
          </form>
        )}
      </div>
    </div>
  );
}
