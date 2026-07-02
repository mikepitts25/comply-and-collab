import Link from "next/link";
import { gatherEvents } from "@/lib/calendar";
import { fmtDate, daysUntil } from "@/lib/format";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

const KIND_CLS: Record<string, string> = {
  ATO: "bg-red-50 text-red-700 ring-1 ring-red-200",
  "POA&M": "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  Milestone: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  ISA: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  "Risk review": "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  "Doc review": "bg-green-50 text-green-700 ring-1 ring-green-200",
};

export default async function CalendarPage() {
  const events = await gatherEvents(180);
  const now = new Date();

  // Group into month buckets for scanability.
  const groups = new Map<string, typeof events>();
  for (const e of events) {
    const key = e.date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(e);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Compliance Calendar</h1>
          <p className="text-sm text-ink-500">
            Every dated obligation across all systems — ATOs, POA&Ms, milestones, ISAs,
            risk-acceptance reviews, and policy/document re-reviews.
          </p>
        </div>
        <a href="/api/calendar" className="btn-ghost" download title="Subscribe in Outlook: download and import this .ics file">
          <Download className="h-4 w-4" /> Outlook (.ics)
        </a>
      </div>

      {[...groups.entries()].map(([month, list]) => (
        <div key={month} className="card overflow-hidden">
          <div className="border-b border-ink-200 bg-ink-50 px-5 py-2 text-sm font-semibold text-ink-700">
            {month}
          </div>
          <ul className="divide-y divide-ink-100">
            {list.map((e, i) => {
              const d = daysUntil(e.date);
              const overdue = d !== null && d < 0;
              return (
                <li key={i} className="flex items-center gap-3 px-5 py-2.5">
                  <span className={`w-24 shrink-0 text-xs ${overdue ? "font-semibold text-red-600" : "text-ink-600"}`}>
                    {fmtDate(e.date)}
                  </span>
                  <span className={`inline-flex w-24 shrink-0 justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_CLS[e.kind] ?? "bg-ink-100 text-ink-600"}`}>
                    {e.kind}
                  </span>
                  <Link href={e.href} className="min-w-0 flex-1 truncate text-sm text-ink-800 hover:underline">
                    {e.title}
                  </Link>
                  <span className="shrink-0 text-xs text-ink-500">{e.system}</span>
                  {d !== null && (
                    <span className={`w-14 shrink-0 text-right text-xs ${overdue ? "font-semibold text-red-600" : "text-ink-500"}`}>
                      {overdue ? `${-d}d late` : `${d}d`}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {events.length === 0 && <p className="text-sm text-ink-500">Nothing scheduled in the next 180 days.</p>}
    </div>
  );
}
