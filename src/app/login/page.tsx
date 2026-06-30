import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { ShieldCheck } from "lucide-react";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");

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
          <LoginForm />
          <div className="mt-4 rounded-md bg-ink-50 p-3 text-xs text-ink-500">
            <p className="font-semibold text-ink-600">Demo accounts</p>
            <p>analyst@demo.mil · engineer@demo.mil · issm@demo.mil</p>
            <p>Password: <code className="font-mono">Password123!</code></p>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-ink-400">
          For authorized use only. CAC/PIV integration available for production.
        </p>
      </div>
    </main>
  );
}
