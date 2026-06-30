"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

export function CreateMitigation({
  controls,
  action,
}: {
  controls: { id: string; title: string }[];
  action: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New statement
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-ink-900">
          New mitigation statement
        </h2>
        <form
          action={(fd) => {
            action(fd);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div>
            <label className="label">Title</label>
            <input name="title" className="input" required />
          </div>
          <div>
            <label className="label">Statement</label>
            <textarea name="body" rows={5} className="input" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Primary control</label>
              <select name="controlId" className="input" defaultValue="">
                <option value="">None</option>
                {controls.map((c) => (
                  <option key={c.id} value={c.id}>{c.id} — {c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tags (comma-separated)</label>
              <input name="tags" className="input" placeholder="RHEL8, crypto" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
