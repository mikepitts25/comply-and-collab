import Link from "next/link";
import { policyHealth, type PolicyState } from "@/lib/policies";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATE_META: Record<PolicyState, { label: string; cls: string; dot: string }> = {
  CURRENT: { label: "Current", cls: "bg-green-100 text-green-800", dot: "bg-green-500" },
  REVIEW_OVERDUE: { label: "Review overdue", cls: "bg-orange-50 text-orange-700 ring-1 ring-orange-200", dot: "bg-orange-500" },
  IN_PROGRESS: { label: "In progress", cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-200", dot: "bg-blue-500" },
  MISSING: { label: "Missing", cls: "bg-red-50 text-red-700 ring-1 ring-red-200", dot: "bg-red-400" },
};

export default async function PoliciesPage() {
  const health = await policyHealth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Policy Health</h1>
        <p className="text-sm text-ink-500">
          Every 800-53 family requires a documented, periodically reviewed policy (the
          &quot;-1&quot; controls). Derived from POLICY documents in each system&apos;s library —
          map a document to AC-1, AU-1, … and set a review frequency to light this up.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-600">
        {Object.entries(STATE_META).map(([k, m]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} /> {m.label}
          </span>
        ))}
      </div>

      {health.map((sys) => (
        <div key={sys.systemId} className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <Link href={`/systems/${sys.systemId}/documents`} className="text-sm font-semibold text-ink-900 hover:underline">
              {sys.acronym}
            </Link>
            <span className="text-xs text-ink-500">
              {sys.current}/{sys.total} families current
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-10">
            {sys.families.map((f) => {
              const m = STATE_META[f.state];
              const doc = f.docs[0];
              return (
                <div
                  key={f.family}
                  className={`rounded-md px-2 py-1.5 text-center ${m.cls}`}
                  title={
                    `${f.family}-1 ${f.name}: ${m.label}` +
                    (doc ? `\n${doc.title}${doc.nextReviewDue ? ` — next review ${fmtDate(doc.nextReviewDue)}` : ""}` : "")
                  }
                >
                  <div className="font-mono text-xs font-semibold">{f.family}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {health.length === 0 && <p className="text-sm text-ink-500">No systems yet.</p>}
    </div>
  );
}
