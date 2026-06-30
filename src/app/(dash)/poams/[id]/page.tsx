import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SeverityBadge, PoamStatusBadge, ImpactBadge } from "@/components/badges";
import { fmtDate, poamNumber } from "@/lib/format";
import {
  updatePoamAction,
  toggleMilestoneAction,
  attachMitigationAction,
  addPoamCommentAction,
} from "@/app/actions/poams";
import { CheckCircle2, Circle } from "lucide-react";
import type { PoamStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES: PoamStatus[] = ["DRAFT", "OPEN", "ONGOING", "RISK_ACCEPTED", "COMPLETED", "CLOSED"];

export default async function PoamDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [poam, users, mitigations] = await Promise.all([
    prisma.poam.findUnique({
      where: { id },
      include: {
        system: true,
        owner: true,
        controls: { include: { control: true } },
        milestones: { orderBy: { createdAt: "asc" } },
        findings: { include: { asset: true } },
        mitigations: true,
        comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.mitigationStatement.findMany({ orderBy: { title: "asc" } }),
  ]);
  if (!poam) notFound();

  return (
    <div className="space-y-5">
      <Link href="/poams" className="text-sm text-ink-500 hover:underline">
        ← Back to POA&Ms
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-sm text-ink-500">{poamNumber(poam.number)}</span>
            <SeverityBadge value={poam.severity} />
            <PoamStatusBadge value={poam.status} />
          </div>
          <h1 className="max-w-2xl text-xl font-semibold text-ink-900">{poam.weakness}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {poam.system.acronym} · Source: {poam.sourceIdentifier ?? "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {poam.recommendation && (
            <div className="card p-5">
              <h2 className="mb-2 text-sm font-semibold text-ink-700">Recommended remediation</h2>
              <p className="whitespace-pre-wrap text-sm text-ink-800">{poam.recommendation}</p>
            </div>
          )}

          {/* Milestones */}
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-700">Milestones</h2>
            <ul className="space-y-2">
              {poam.milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <form action={toggleMilestoneAction}>
                    <input type="hidden" name="milestoneId" value={m.id} />
                    <input type="hidden" name="poamId" value={poam.id} />
                    <input type="hidden" name="completed" value={String(m.completed)} />
                    <button className="text-ink-400 hover:text-green-600" title="Toggle complete">
                      {m.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                  </form>
                  <div className="flex-1">
                    <div className={m.completed ? "text-sm text-ink-400 line-through" : "text-sm text-ink-800"}>
                      {m.description}
                    </div>
                    {m.dueDate && (
                      <div className="text-[11px] text-ink-400">Due {fmtDate(m.dueDate)}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Linked findings */}
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-700">
              Linked findings ({poam.findings.length})
            </h2>
            <ul className="divide-y divide-ink-100">
              {poam.findings.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-2">
                  <Link href={`/findings/${f.id}`} className="text-sm text-ink-800 hover:underline">
                    {f.title}
                    <span className="ml-2 text-xs text-ink-400">{f.asset?.hostname}</span>
                  </Link>
                  <SeverityBadge value={f.severity} />
                </li>
              ))}
            </ul>
          </div>

          {/* Mitigations */}
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-700">Mitigation statements</h2>
            <ul className="mb-3 space-y-2">
              {poam.mitigations.map((m) => (
                <li key={m.id} className="rounded-md border border-ink-200 p-3">
                  <div className="text-sm font-medium text-ink-900">{m.title}</div>
                  <p className="mt-1 text-xs text-ink-600">{m.body}</p>
                </li>
              ))}
              {poam.mitigations.length === 0 && (
                <li className="text-sm text-ink-500">None attached.</li>
              )}
            </ul>
            <form action={attachMitigationAction} className="flex gap-2">
              <input type="hidden" name="poamId" value={poam.id} />
              <select name="mitigationId" className="input" defaultValue="">
                <option value="">Attach from library…</option>
                {mitigations.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} {m.approved ? "✓" : "(draft)"}
                  </option>
                ))}
              </select>
              <button className="btn-ghost shrink-0">Attach</button>
            </form>
          </div>

          {/* Comments */}
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-700">
              Discussion ({poam.comments.length})
            </h2>
            <ul className="space-y-3">
              {poam.comments.map((c) => (
                <li key={c.id} className="rounded-md border border-ink-200 p-3">
                  <div className="mb-1 text-xs text-ink-500">
                    <span className="font-medium text-ink-700">{c.author.name}</span> · {fmtDate(c.createdAt)}
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-ink-800">{c.body}</div>
                </li>
              ))}
              {poam.comments.length === 0 && <li className="text-sm text-ink-500">No comments yet.</li>}
            </ul>
            <form action={addPoamCommentAction} className="mt-3 flex gap-2">
              <input type="hidden" name="poamId" value={poam.id} />
              <input name="body" placeholder="Add a comment…" className="input" required />
              <button className="btn-primary shrink-0">Post</button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-700">Manage</h2>
            <form action={updatePoamAction} className="space-y-3">
              <input type="hidden" name="poamId" value={poam.id} />
              <div>
                <label className="label">Status</label>
                <select name="status" defaultValue={poam.status} className="input">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Owner</label>
                <select name="ownerId" defaultValue={poam.ownerId ?? ""} className="input">
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Residual risk</label>
                <select name="residualRisk" defaultValue={poam.residualRisk ?? ""} className="input">
                  <option value="">Not assessed</option>
                  <option value="LOW">Low</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <button className="btn-primary w-full">Save</button>
            </form>
          </div>

          <div className="card p-5 text-sm">
            <h2 className="mb-3 text-sm font-semibold text-ink-700">Details</h2>
            <Row label="Risk rating"><ImpactBadge value={poam.riskRating} /></Row>
            <Row label="Detected">{fmtDate(poam.detectionDate)}</Row>
            <Row label="Scheduled">{fmtDate(poam.scheduledCompletion)}</Row>
            <Row label="Completed">{fmtDate(poam.actualCompletion)}</Row>
          </div>

          <div className="card p-5">
            <h2 className="mb-2 text-sm font-semibold text-ink-700">Affected controls</h2>
            <div className="flex flex-wrap gap-1">
              {poam.controls.map((c) => (
                <Link
                  key={c.controlId}
                  href={`/controls/${c.controlId}`}
                  className="rounded bg-ink-100 px-2 py-0.5 font-mono text-xs text-ink-700 hover:bg-ink-200"
                  title={c.control.title}
                >
                  {c.controlId}
                </Link>
              ))}
              {poam.controls.length === 0 && <span className="text-xs text-ink-400">—</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 py-1.5 last:border-0">
      <span className="text-ink-500">{label}</span>
      <span className="text-ink-900">{children}</span>
    </div>
  );
}
