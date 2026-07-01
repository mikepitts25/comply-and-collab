"use client";

import { useActionState } from "react";
import { changeOwnPasswordAction, type PasswordState } from "@/app/actions/account";

export function ChangePassword() {
  const [state, action, pending] = useActionState<PasswordState | undefined, FormData>(
    changeOwnPasswordAction,
    undefined
  );

  return (
    <form action={action} className="max-w-sm space-y-3">
      <div>
        <label className="label">Current password</label>
        <input name="current" type="password" className="input" autoComplete="current-password" required />
      </div>
      <div>
        <label className="label">New password (8+ characters)</label>
        <input name="next" type="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <label className="label">Confirm new password</label>
        <input name="confirm" type="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      {state?.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Password updated.</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "Updating…" : "Change password"}</button>
    </form>
  );
}
