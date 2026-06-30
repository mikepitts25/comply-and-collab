"use client";

import { useActionState } from "react";
import { importScansAction, type ImportState } from "@/app/actions/import";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";

export function ImportForm({
  systems,
}: {
  systems: { id: string; acronym: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ImportState | undefined, FormData>(
    importScansAction,
    undefined
  );

  return (
    <div className="space-y-5">
      <form action={action} className="card space-y-4 p-5">
        <div>
          <label className="label">Target system</label>
          <select name="systemId" className="input" required defaultValue={systems[0]?.id}>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.acronym} — {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Scan files</label>
          <input
            type="file"
            name="files"
            multiple
            accept=".nessus,.ckl,.cklb,.xml,.json"
            className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-md file:border-0 file:bg-ink-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-ink-800"
            required
          />
          <p className="mt-1 text-xs text-ink-500">
            Supports ACAS <code>.nessus</code>, STIG <code>.ckl</code> (XML) /{" "}
            <code>.cklb</code> (JSON), and SCAP/XCCDF <code>.xml</code> (SCC,
            OpenSCAP). Multiple files allowed.
          </p>
        </div>

        <button className="btn-primary" disabled={pending}>
          <Upload className="h-4 w-4" />
          {pending ? "Importing…" : "Import & correlate"}
        </button>
      </form>

      {state?.error && (
        <div className="card flex items-start gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {state?.results && state.results.length > 0 && (
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Imported {state.results.length} file(s)
          </div>
          <table className="w-full">
            <thead className="border-b border-ink-200">
              <tr>
                <th className="th">File</th>
                <th className="th">Type</th>
                <th className="th">Assets</th>
                <th className="th">Findings</th>
                <th className="th">Open</th>
                <th className="th">New</th>
                <th className="th">Auto-closed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {state.results.map((r) => (
                <tr key={r.filename}>
                  <td className="td font-medium">{r.filename}</td>
                  <td className="td text-xs">{r.scanType}</td>
                  <td className="td">{r.assets}</td>
                  <td className="td">{r.total}</td>
                  <td className="td text-red-600">{r.open}</td>
                  <td className="td">{r.isNew}</td>
                  <td className="td text-green-600">{r.closed || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm text-ink-500">
            Findings were correlated to NIST 800-53 controls. Head to{" "}
            <a href="/findings" className="font-medium text-ink-900 underline">
              Findings
            </a>{" "}
            or generate POA&Ms from the system page.
          </p>
        </div>
      )}
    </div>
  );
}
