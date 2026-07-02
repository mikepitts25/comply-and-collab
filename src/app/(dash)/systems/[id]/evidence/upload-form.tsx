"use client";

import { useActionState } from "react";
import { uploadEvidenceAction, type EvidenceState } from "@/app/actions/evidence";

export function UploadEvidence({
  systemId,
  controls,
}: {
  systemId: string;
  controls: { id: string; controlId: string }[];
}) {
  const [state, action, pending] = useActionState<EvidenceState | undefined, FormData>(
    uploadEvidenceAction,
    undefined
  );

  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="systemId" value={systemId} />
      <select name="systemControlId" className="input" required defaultValue="">
        <option value="" disabled>Control…</option>
        {controls.map((c) => (
          <option key={c.id} value={c.id}>{c.controlId}</option>
        ))}
      </select>
      <input
        type="file"
        name="file"
        className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink-800 hover:file:bg-ink-200"
      />
      <input
        name="description"
        placeholder="What this evidence demonstrates (required)…"
        className="input sm:col-span-2"
        required
      />
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
          {state.error}
        </p>
      )}
      <button className="btn-primary sm:col-span-2" disabled={pending}>
        {pending ? "Uploading…" : "Attach evidence"}
      </button>
      <p className="text-xs text-ink-500 sm:col-span-2">
        File optional (10 MB max) — a description alone records where evidence lives
        (e.g. a document repository reference).
      </p>
    </form>
  );
}
