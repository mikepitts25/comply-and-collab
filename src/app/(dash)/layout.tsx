import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { logoutAction } from "@/app/actions/auth";
import { LogOut } from "lucide-react";

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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink-200 bg-white px-6 py-3 print:hidden">
          <div className="text-sm text-ink-500">
            On-prem deployment · IL5 enclave
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
