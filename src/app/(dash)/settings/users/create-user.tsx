"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { createUserAction, type UserFormState } from "@/app/actions/users";
import { UserPlus } from "lucide-react";

const ROLES = ["ADMIN", "ISSM", "ISSO", "ANALYST", "ENGINEER", "AUDITOR"];

export function CreateUser() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<UserFormState | undefined, FormData>(
    createUserAction,
    undefined
  );
  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state?.ok]);

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> New user
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-ink-900">New user</h2>
        <form action={action} className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" required />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" className="input" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role</label>
              <select name="role" className="input" defaultValue="ANALYST">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">EDIPI (optional)</label>
              <input name="edipi" className="input" placeholder="10-digit" />
            </div>
          </div>
          <div>
            <label className="label">Temporary password (8+ chars)</label>
            <input name="password" type="text" className="input" required minLength={8} />
          </div>
          {state?.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Creating…" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
