"use client";

import { useActionState } from "react";
import { createApiKeyAction, type CreateKeyState } from "@/app/actions/apikeys";
import { KeyRound, Copy } from "lucide-react";

export function CreateKey({
  users,
}: {
  users: { id: string; name: string; role: string }[];
}) {
  const [state, action, pending] = useActionState<CreateKeyState | undefined, FormData>(
    createApiKeyAction,
    undefined
  );

  return (
    <div className="card p-5">
      <h2 className="mb-3 text-sm font-semibold text-ink-700">Create API key</h2>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label">Name</label>
          <input name="name" placeholder="e.g. ACAS nightly pipeline" className="input w-56" required />
        </div>
        <div>
          <label className="label">Runs as</label>
          <select name="ownerId" className="input w-56" defaultValue={users[0]?.id}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
        </div>
        <button className="btn-primary" disabled={pending}>
          <KeyRound className="h-4 w-4" /> {pending ? "Creating…" : "Create key"}
        </button>
      </form>

      {state?.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      {state?.plaintext && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">
            Key created — copy it now. It won't be shown again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-white px-3 py-2 font-mono text-xs text-ink-800 ring-1 ring-ink-200">
              {state.plaintext}
            </code>
            <Copy className="h-4 w-4 text-ink-500" />
          </div>
        </div>
      )}
    </div>
  );
}
