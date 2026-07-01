"use client";

const IMPACTS = ["LOW", "MODERATE", "HIGH"] as const;
const STATUSES = [
  "NOT_STARTED", "IN_PROGRESS", "ATO", "ATO_WITH_CONDITIONS", "IATT", "DENIED", "EXPIRED", "DECOMMISSIONED",
] as const;
const FRAMEWORKS: { value: string; label: string }[] = [
  { value: "RMF_800_53", label: "NIST RMF / 800-53" },
  { value: "STIG", label: "DISA STIG / SRG" },
  { value: "CMMC", label: "CMMC" },
  { value: "FEDRAMP", label: "FedRAMP" },
];

export interface SystemDefaults {
  name?: string;
  acronym?: string;
  description?: string | null;
  confidentiality?: string;
  integrity?: string;
  availability?: string;
  frameworks?: string[];
  authorizationStatus?: string;
  atoDate?: string;
  atoExpiration?: string;
  authorizingOfficial?: string | null;
  isCommonControlProvider?: boolean;
}

/** Shared system attribute fields; `create` shows the (immutable) acronym input. */
export function SystemFields({ d = {}, create }: { d?: SystemDefaults; create?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Name</label>
          <input name="name" className="input" defaultValue={d.name ?? ""} required />
        </div>
        <div>
          <label className="label">Acronym</label>
          <input name="acronym" className="input" defaultValue={d.acronym ?? ""} disabled={!create} required={create} />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea name="description" rows={2} className="input" defaultValue={d.description ?? ""} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(["confidentiality", "integrity", "availability"] as const).map((k) => (
          <div key={k}>
            <label className="label">{k[0].toUpperCase() + k.slice(1)}</label>
            <select name={k} className="input" defaultValue={(d as any)[k] ?? "MODERATE"}>
              {IMPACTS.map((x) => <option key={x} value={x}>{x[0] + x.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-400">Overall categorization is the FIPS 199 high-water mark of C/I/A.</p>
      <div>
        <label className="label">Frameworks</label>
        <div className="flex flex-wrap gap-3">
          {FRAMEWORKS.map((f) => (
            <label key={f.value} className="flex items-center gap-1.5 text-sm text-ink-700">
              <input type="checkbox" name="frameworks" value={f.value} defaultChecked={(d.frameworks ?? ["RMF_800_53"]).includes(f.value)} />
              {f.label}
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Authorization status</label>
          <select name="authorizationStatus" className="input" defaultValue={d.authorizationStatus ?? "IN_PROGRESS"}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Authorizing Official</label>
          <input name="authorizingOfficial" className="input" defaultValue={d.authorizingOfficial ?? ""} />
        </div>
        <div>
          <label className="label">ATO date</label>
          <input type="date" name="atoDate" className="input" defaultValue={d.atoDate ?? ""} />
        </div>
        <div>
          <label className="label">ATO expiration</label>
          <input type="date" name="atoExpiration" className="input" defaultValue={d.atoExpiration ?? ""} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" name="isCommonControlProvider" defaultChecked={d.isCommonControlProvider ?? false} />
        Common control provider
      </label>
    </div>
  );
}
