import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isCacEnabled } from "@/lib/cac";
import { LoginForm } from "./login-form";
import { ShieldCheck, IdCard } from "lucide-react";

const CAC_ERRORS: Record<string, string> = {
  cac_disabled: "CAC/PIV sign-in is not enabled on this server.",
  cac_no_cert: "No client certificate was presented.",
  cac_unknown: "This CAC/PIV identity is not provisioned. Contact an administrator.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSessionUser()) redirect("/");
  const { error } = await searchParams;
  const cac = isCacEnabled();

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold text-white">Comply &amp; Collab</h1>
          <p className="mt-1 text-sm text-ink-300">
            Cyber compliance &amp; ATO collaboration
          </p>
        </div>
        <div className="card p-6">
          {error && CAC_ERRORS[error] && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {CAC_ERRORS[error]}
            </p>
          )}

          {cac && (
            <>
              <a href="/api/auth/cac" className="btn-primary mb-3 w-full">
                <IdCard className="h-4 w-4" /> Sign in with CAC/PIV
              </a>
              <div className="my-3 flex items-center gap-2 text-xs text-ink-400">
                <span className="h-px flex-1 bg-ink-200" /> or <span className="h-px flex-1 bg-ink-200" />
              </div>
            </>
          )}

          <LoginForm />
          <div className="mt-4 rounded-md bg-ink-50 p-3 text-xs text-ink-500">
            <p className="font-semibold text-ink-600">Demo accounts</p>
            <p>analyst@demo.mil · engineer@demo.mil · issm@demo.mil</p>
            <p>Password: <code className="font-mono">Password123!</code></p>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-ink-400">
          For authorized use only.
          {cac ? " CAC/PIV enabled." : " CAC/PIV available for production."}
        </p>
      </div>
    </main>
  );
}
