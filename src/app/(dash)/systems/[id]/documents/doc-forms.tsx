"use client";

import { useActionState } from "react";
import { createDocumentAction, addVersionAction, type DocState } from "@/app/actions/documents";
import { FileUp, AlertTriangle } from "lucide-react";

const CATEGORIES = [
  ["POLICY", "Policy"],
  ["PLAN", "Plan (SSP, IRP…)"],
  ["DIAGRAM", "Diagram"],
  ["AUTHORIZATION", "Authorization"],
  ["ASSESSMENT", "Assessment"],
  ["AGREEMENT", "Agreement"],
  ["OTHER", "Other"],
] as const;

function ErrorNote({ state }: { state: DocState | undefined }) {
  if (!state?.error) return null;
  return (
    <p className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
    </p>
  );
}

const fileInputCls =
  "block w-full text-sm text-ink-700 file:mr-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink-800 hover:file:bg-ink-200";

export function NewDocumentForm({ systemId }: { systemId: string }) {
  const [state, action, pending] = useActionState<DocState | undefined, FormData>(
    createDocumentAction,
    undefined
  );
  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="systemId" value={systemId} />
      <input name="title" placeholder="Document title" aria-label="Document title" className="input" required />
      <select name="category" aria-label="Category" className="input" defaultValue="OTHER">
        {CATEGORIES.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      <input type="file" name="file" required aria-label="Document file" className={fileInputCls} />
      <input
        name="changeNote"
        placeholder="Initial note (e.g. imported from shared drive, FY26 draft)"
        aria-label="Initial change note"
        className="input"
        required
      />
      <ErrorNote state={state} />
      <button className="btn-primary sm:col-span-2" disabled={pending}>
        <FileUp className="h-4 w-4" /> {pending ? "Uploading…" : "Add document"}
      </button>
    </form>
  );
}

export function NewVersionForm({ systemId, documentId }: { systemId: string; documentId: string }) {
  const [state, action, pending] = useActionState<DocState | undefined, FormData>(
    addVersionAction,
    undefined
  );
  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="systemId" value={systemId} />
      <input type="hidden" name="documentId" value={documentId} />
      <input type="file" name="file" required aria-label="New version file" className={fileInputCls} />
      <input
        name="changeNote"
        placeholder="What changed in this version (required)"
        aria-label="What changed in this version"
        className="input"
        required
      />
      <ErrorNote state={state} />
      <button className="btn-primary sm:col-span-2" disabled={pending}>
        <FileUp className="h-4 w-4" /> {pending ? "Uploading…" : "Upload new version"}
      </button>
    </form>
  );
}
