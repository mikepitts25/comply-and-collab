import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fmtDate } from "@/lib/format";
import { revokeApiKeyAction } from "@/app/actions/apikeys";
import { CreateKey } from "./create-key";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!can(user.role, "apikey:manage")) {
    return (
      <p className="text-sm text-ink-500">
        Your role does not have access to API key management.
      </p>
    );
  }

  const [keys, users] = await Promise.all([
    prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">API Keys</h1>
        <p className="text-sm text-ink-500">
          Programmatic access for automated scan ingestion. Keys run as their
          owning user, so that user's role governs what the key can do.
        </p>
      </div>

      <CreateKey users={users} />

      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3 text-sm font-semibold text-ink-700">
          Keys ({keys.length})
        </div>
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              <th className="th">Name</th><th className="th">Prefix</th>
              <th className="th">Runs as</th><th className="th">Created</th>
              <th className="th">Last used</th><th className="th">Status</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {keys.map((k) => (
              <tr key={k.id}>
                <td className="td font-medium">{k.name}</td>
                <td className="td font-mono text-xs">{k.prefix}…</td>
                <td className="td text-xs">{k.user.name} ({k.user.role})</td>
                <td className="td text-xs text-ink-500">{fmtDate(k.createdAt)}</td>
                <td className="td text-xs text-ink-500">{k.lastUsedAt ? fmtDate(k.lastUsedAt) : "never"}</td>
                <td className="td">
                  {k.revokedAt ? (
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600">Revoked</span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Active</span>
                  )}
                </td>
                <td className="td">
                  {!k.revokedAt && (
                    <form action={revokeApiKeyAction}>
                      <input type="hidden" name="id" value={k.id} />
                      <button className="text-xs text-red-600 hover:underline">Revoke</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr><td className="td text-ink-500" colSpan={7}>No API keys yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Usage */}
      <div className="card p-5">
        <h2 className="mb-2 text-sm font-semibold text-ink-700">Usage</h2>
        <pre className="overflow-x-auto rounded-md bg-ink-950 p-4 text-xs text-ink-100">
{`curl -X POST "https://<host>/api/v1/scans?system=<SYSTEM_ID>" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "X-Filename: acas-scan.nessus" \\
  --data-binary @acas-scan.nessus`}
        </pre>
        <p className="mt-2 text-xs text-ink-500">
          Accepts ACAS <code>.nessus</code>, STIG <code>.ckl</code>/<code>.cklb</code>, and SCAP/XCCDF <code>.xml</code>.
          Returns a JSON summary (findings imported, open, new, auto-closed).
        </p>
      </div>
    </div>
  );
}
