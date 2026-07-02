"use client";

import { useState } from "react";
import { bulkUpdateFindingsAction } from "@/app/actions/findings";
import type { FindingStatus } from "@prisma/client";

const STATUSES: FindingStatus[] = ["OPEN", "NOT_A_FINDING", "NOT_APPLICABLE", "NOT_REVIEWED", "CLOSED"];

/**
 * Wraps the findings table in a form and provides bulk triage: a select-all
 * toggle, a live selection count, and status/assignee apply controls. The
 * per-row checkboxes (name="findingIds") are rendered by the server table
 * inside {children}.
 */
export function BulkBar({
  users,
  enabled,
  children,
}: {
  users: { id: string; name: string; role: string }[];
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(0);

  if (!enabled) return <>{children}</>;

  function onFormChange(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const boxes = form.querySelectorAll<HTMLInputElement>('input[name="findingIds"]');
    setCount([...boxes].filter((b) => b.checked).length);
  }

  function toggleAll(e: React.ChangeEvent<HTMLInputElement>) {
    const form = e.currentTarget.closest("form")!;
    form.querySelectorAll<HTMLInputElement>('input[name="findingIds"]').forEach((b) => {
      b.checked = e.currentTarget.checked;
    });
    setCount(e.currentTarget.checked ? form.querySelectorAll('input[name="findingIds"]').length : 0);
  }

  return (
    <form action={bulkUpdateFindingsAction} onChange={onFormChange}>
      <div className="card mb-3 flex flex-wrap items-center gap-2 p-3">
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" onChange={toggleAll} className="h-4 w-4" aria-label="Select all findings" />
          Select all
        </label>
        <span className="text-sm text-ink-500">{count} selected</span>
        <div className="mx-2 h-5 w-px bg-ink-200" />
        <select name="status" defaultValue="" aria-label="Set status for selected findings" className="input w-44 py-1 text-sm">
          <option value="">Set status…</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <select name="assigneeId" defaultValue="__keep__" aria-label="Set assignee for selected findings" className="input w-52 py-1 text-sm">
          <option value="__keep__">Keep assignee</option>
          <option value="">Unassign</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
        </select>
        <button className="btn-primary py-1 text-sm" disabled={count === 0}>
          Apply to {count}
        </button>
      </div>
      {children}
    </form>
  );
}
