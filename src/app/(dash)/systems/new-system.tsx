"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createSystemAction, type SystemFormState } from "@/app/actions/systems";
import { SystemFields } from "./system-fields";
import { Plus } from "lucide-react";

export function NewSystem() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<SystemFormState | undefined, FormData>(
    createSystemAction,
    undefined
  );

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New system
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
      <div className="my-8 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-ink-900">New system</h2>
        <form action={action} className="space-y-4">
          <SystemFields create />
          {state?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Creating…" : "Create system"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
