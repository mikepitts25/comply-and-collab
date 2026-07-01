import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fmtDate } from "@/lib/format";
import { updateUserAction } from "@/app/actions/users";
import { CreateUser } from "./create-user";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ROLES: Role[] = ["ADMIN", "ISSM", "ISSO", "ANALYST", "ENGINEER", "AUDITOR"];

export default async function UsersPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  if (!can(me.role, "user:manage")) {
    return <p className="text-sm text-ink-500">Your role does not have access to user management.</p>;
  }

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { apiKeys: true } } },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Users</h1>
          <p className="text-sm text-ink-500">
            Manage accounts, roles, EDIPI mapping (for CAC/PIV), and activation.
          </p>
        </div>
        <CreateUser />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              <th className="th">Name / Email</th><th className="th">Role</th>
              <th className="th">EDIPI</th><th className="th">Active</th>
              <th className="th">Created</th><th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="td">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-ink-500">{u.email}</div>
                </td>
                <td className="td" colSpan={5}>
                  <form action={updateUserAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="role" defaultValue={u.role} className="input w-32 py-1 text-xs">
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <input name="edipi" defaultValue={u.edipi ?? ""} placeholder="EDIPI" className="input w-32 py-1 text-xs" />
                    <label className="flex items-center gap-1 text-xs text-ink-600">
                      <input type="checkbox" name="active" defaultChecked={u.active} disabled={u.id === me.id} />
                      Active
                    </label>
                    <span className="text-xs text-ink-400">{fmtDate(u.createdAt)}</span>
                    <button className="btn-ghost py-1 text-xs">Save</button>
                    {u._count.apiKeys > 0 && <span className="text-[11px] text-ink-400">{u._count.apiKeys} key(s)</span>}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-400">
        You cannot deactivate your own account. New users receive the temporary password you set;
        they should change it after first sign-in.
      </p>
    </div>
  );
}
