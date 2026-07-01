import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ROLE_CAPABILITIES } from "@/lib/rbac";
import { ChangePassword } from "./change-password";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator", ISSM: "ISSM", ISSO: "ISSO",
  ANALYST: "Compliance Analyst", ENGINEER: "Systems Engineer", AUDITOR: "Auditor",
};

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const caps = ROLE_CAPABILITIES[user.role] ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">My Account</h1>
        <p className="text-sm text-ink-500">Your profile and password.</p>
      </div>

      <div className="card p-5 text-sm">
        <h2 className="mb-3 text-sm font-semibold text-ink-700">Profile</h2>
        <Row label="Name">{user.name}</Row>
        <Row label="Email">{user.email}</Row>
        <Row label="Role">{ROLE_LABEL[user.role] ?? user.role}</Row>
        <Row label="Permissions">{caps.length} capabilit{caps.length === 1 ? "y" : "ies"}</Row>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink-700">Change password</h2>
        <ChangePassword />
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-ink-100 py-1.5 last:border-0">
      <span className="text-ink-500">{label}</span>
      <span className="text-ink-900">{children}</span>
    </div>
  );
}
