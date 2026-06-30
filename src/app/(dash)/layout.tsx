import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ROLE_CAPABILITIES } from "@/lib/rbac";
import { Sidebar } from "@/components/sidebar";
import { logoutAction } from "@/app/actions/auth";
import { LogOut, Eye } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  ISSM: "ISSM",
  ISSO: "ISSO",
  ANALYST: "Compliance Analyst",
  ENGINEER: "Systems Engineer",
  AUDITOR: "Auditor",
};

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const capabilities = ROLE_CAPABILITIES[user.role] ?? [];
  const readOnly = capabilities.length <= 1; // AUDITOR (comment only) / observers

  return (
    <div className="flex min-h-screen">
      <Sidebar capabilities={capabilities} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink-200 bg-white px-6 py-3 print:hidden">
          <div className="flex items-center gap-3 text-sm text-ink-500">
            <span>On-prem deployment · IL5 enclave</span>
            {readOnly && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">
                <Eye className="h-3 w-3" /> Read-only access
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right leading-tight">
              <div className="text-sm font-medium text-ink-900">{user.name}</div>
              <div className="text-xs text-ink-500">
                {ROLE_LABEL[user.role] ?? user.role}
              </div>
            </div>
            <form action={logoutAction}>
              <button className="btn-ghost" title="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">{children}</main>
      </div>
    </div>
  );
}
