import { fmtDate } from "@/lib/format";
import { requestDeviationAction, decideDeviationAction } from "@/app/actions/deviations";
import type { Deviation, User } from "@prisma/client";

type DeviationWithPeople = Deviation & {
  requestedBy: Pick<User, "name">;
  decidedBy: Pick<User, "name"> | null;
};

const TYPE_LABEL: Record<string, string> = {
  FALSE_POSITIVE: "False positive",
  OPERATIONAL_REQUIREMENT: "Operational requirement (N/A)",
};

const STATUS_CLS: Record<string, string> = {
  PENDING: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

/**
 * Deviation workflow card for the finding detail page: request a false-positive
 * or operational-requirement deviation, and (for risk:accept holders) decide
 * pending requests. Approval retires the finding with the matching status.
 */
export function DeviationCard({
  findingId,
  findingOpen,
  deviations,
  canRequest,
  canDecide,
}: {
  findingId: string;
  findingOpen: boolean;
  deviations: DeviationWithPeople[];
  canRequest: boolean;
  canDecide: boolean;
}) {
  const pending = deviations.find((d) => d.status === "PENDING");

  return (
    <div className="card p-5">
      <h2 className="mb-3 text-sm font-semibold text-ink-700">Deviations</h2>

      <ul className="space-y-3">
        {deviations.map((d) => (
          <li key={d.id} className="rounded-md border border-ink-200 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink-900">
                {TYPE_LABEL[d.type] ?? d.type}
              </span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[d.status]}`}
              >
                {d.status}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-xs text-ink-700">{d.justification}</p>
            {d.evidence && (
              <p className="mt-1 whitespace-pre-wrap rounded bg-ink-50 p-2 font-mono text-[11px] text-ink-600">
                {d.evidence}
              </p>
            )}
            <div className="mt-2 text-[11px] text-ink-500">
              Requested by {d.requestedBy.name} · {fmtDate(d.requestedAt)}
              {d.decidedBy && (
                <>
                  {" "}· {d.status === "APPROVED" ? "Approved" : "Rejected"} by {d.decidedBy.name}{" "}
                  {fmtDate(d.decidedAt)}
                  {d.decisionNote ? ` — “${d.decisionNote}”` : ""}
                </>
              )}
            </div>

            {d.status === "PENDING" && canDecide && (
              <form action={decideDeviationAction} className="mt-3 space-y-2 border-t border-ink-100 pt-3">
                <input type="hidden" name="deviationId" value={d.id} />
                <input type="hidden" name="findingId" value={findingId} />
                <input
                  name="note"
                  placeholder="Decision note (optional)"
                  className="input py-1 text-xs"
                />
                <div className="flex gap-2">
                  <button name="decision" value="approve" className="btn-primary flex-1 py-1 text-xs">
                    Approve
                  </button>
                  <button name="decision" value="reject" className="btn-ghost flex-1 py-1 text-xs">
                    Reject
                  </button>
                </div>
              </form>
            )}
          </li>
        ))}
        {deviations.length === 0 && (
          <li className="text-sm text-ink-500">No deviation requests.</li>
        )}
      </ul>

      {canRequest && findingOpen && !pending && (
        <form action={requestDeviationAction} className="mt-4 space-y-2 border-t border-ink-100 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Request deviation
          </div>
          <input type="hidden" name="findingId" value={findingId} />
          <select name="type" className="input py-1 text-xs" defaultValue="FALSE_POSITIVE">
            <option value="FALSE_POSITIVE">False positive</option>
            <option value="OPERATIONAL_REQUIREMENT">Operational requirement (N/A)</option>
          </select>
          <textarea
            name="justification"
            rows={3}
            required
            placeholder="Why this finding does not apply (required)…"
            className="input text-xs"
          />
          <textarea
            name="evidence"
            rows={2}
            placeholder="Supporting evidence — version output, config excerpt (optional)…"
            className="input font-mono text-[11px]"
          />
          <button className="btn-ghost w-full py-1.5 text-xs">Submit for review</button>
        </form>
      )}
    </div>
  );
}
