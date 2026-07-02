"use client";

import { useActionState } from "react";
import {
  importPoamSheetAction,
  importControlsSheetAction,
  type SheetImportState,
} from "@/app/actions/import-sheets";
import { FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";

function Result({ state }: { state: SheetImportState | undefined }) {
  if (!state) return null;
  return (
    <div className="space-y-2 sm:col-span-2">
      {state.error && (
        <p className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}
      {state.ok && (
        <p className="flex items-start gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {state.message}
        </p>
      )}
      {state.warnings?.map((w) => (
        <p key={w} className="rounded-md bg-yellow-50 px-3 py-1.5 text-xs text-yellow-800">
          {w}
        </p>
      ))}
    </div>
  );
}

function SheetForm({
  action,
  systems,
  fileLabel,
  buttonLabel,
}: {
  action: (prev: SheetImportState | undefined, fd: FormData) => Promise<SheetImportState>;
  systems: { id: string; acronym: string; name: string }[];
  fileLabel: string;
  buttonLabel: string;
}) {
  const [state, formAction, pending] = useActionState<SheetImportState | undefined, FormData>(
    action,
    undefined
  );
  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <select name="systemId" className="input" required defaultValue={systems[0]?.id} aria-label="Target system">
        {systems.map((s) => (
          <option key={s.id} value={s.id}>
            {s.acronym} — {s.name}
          </option>
        ))}
      </select>
      <input
        type="file"
        name="file"
        accept=".csv,.xlsx"
        required
        aria-label={fileLabel}
        className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink-800 hover:file:bg-ink-200"
      />
      <div className="flex gap-2 sm:col-span-2">
        <button name="mode" value="preview" className="btn-ghost flex-1" disabled={pending}>
          {pending ? "Working…" : "Preview (no changes)"}
        </button>
        <button name="mode" value="import" className="btn-primary flex-1" disabled={pending}>
          <FileSpreadsheet className="h-4 w-4" />
          {pending ? "Working…" : buttonLabel}
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}

export function SheetImports({
  systems,
}: {
  systems: { id: string; acronym: string; name: string }[];
}) {
  return (
    <div className="card space-y-6 p-5">
      <div>
        <h2 className="text-sm font-semibold text-ink-700">
          Import from spreadsheets (.csv / .xlsx)
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          Bring existing trackers in without retyping. Column headers are matched
          flexibly; the app&apos;s own POA&amp;M export re-imports directly, so you can
          export → edit in Excel → re-import (rows are matched by POA&amp;M Item ID).
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
          POA&amp;M workbook
        </h3>
        <p className="mb-2 text-xs text-ink-500">
          Needs a weakness/description column. Recognized: POA&amp;M Item ID, Severity
          (CAT I/II/III or High/Moderate/Low), Status, Scheduled Completion Date,
          Milestones (&quot;desc (due date); …&quot;), Source, Resources, Recommendations,
          Residual Risk. Sample: <code>samples/poam-import-sample.csv</code>
        </p>
        <SheetForm
          action={importPoamSheetAction}
          systems={systems}
          fileLabel="POA&M workbook file"
          buttonLabel="Import POA&Ms"
        />
      </div>

      <div className="border-t border-ink-100 pt-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
          SSP control tracker
        </h3>
        <p className="mb-2 text-xs text-ink-500">
          Columns: Control (AC-2, AC-2(1)…), Status (Implemented / Partial / Planned /
          Not Implemented / Inherited / N/A), Narrative. Upserts the system&apos;s
          documented controls. Sample: <code>samples/control-tracker-sample.csv</code>
        </p>
        <SheetForm
          action={importControlsSheetAction}
          systems={systems}
          fileLabel="Control tracker file"
          buttonLabel="Import control tracker"
        />
      </div>
    </div>
  );
}
