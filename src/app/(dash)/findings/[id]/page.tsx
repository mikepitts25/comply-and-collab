import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SeverityBadge, FindingStatusBadge } from "@/components/badges";
import { fmtDate, poamNumber } from "@/lib/format";
import { addCommentAction, updateFindingAction } from "@/app/actions/findings";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { DeviationCard } from "@/components/deviation-card";
import type { FindingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES: FindingStatus[] = ["OPEN", "NOT_A_FINDING", "NOT_APPLICABLE", "NOT_REVIEWED", "CLOSED"];

export default async function FindingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [finding, users] = await Promise.all([
    prisma.finding.findUnique({
      where: { id },
      include: {
        system: true,
        asset: true,
        assignee: true,
        ccis: true,
        controls: { include: { control: true } },
        poam: true,
        comments_rel: { include: { author: true }, orderBy: { createdAt: "asc" } },
        deviations: {
          include: { requestedBy: true, decidedBy: true },
          orderBy: { requestedAt: "desc" },
        },
      },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!finding) notFound();

  const sessionUser = await getSessionUser();
  const canUpdate = sessionUser ? can(sessionUser.role, "finding:update") : false;
  const canComment = sessionUser ? can(sessionUser.role, "comment:create") : false;

  return (
    <div className="space-y-5">
      <Link href="/findings" className="text-sm text-ink-500 hover:underline">
        ← Back to findings
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <SeverityBadge value={finding.severity} />
            <FindingStatusBadge value={finding.status} />
            <span className="rounded bg-ink-100 px-2 py-0.5 text-xs text-ink-600">
              {finding.source}
            </span>
          </div>
          <h1 className="text-xl font-semibold text-ink-900">{finding.title}</h1>
          <p className="mt-1 font-mono text-xs text-ink-500">
            {finding.stigId ? `${finding.stigId} · ` : ""}
            {finding.ruleId}
            {finding.cve ? ` · ${finding.cve}` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {finding.description && (
            <Section title="Discussion">{finding.description}</Section>
          )}
          {finding.checkText && (
            <Section title="Check">{finding.checkText}</Section>
          )}
          {finding.fixText && <Section title="Fix">{finding.fixText}</Section>}
          {finding.comments && (
            <Section title="Finding details / engineer notes">
              {finding.comments}
            </Section>
          )}

          {/* Collaboration thread */}
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-700">
              Discussion ({finding.comments_rel.length})
            </h2>
            <ul className="space-y-3">
              {finding.comments_rel.map((c) => (
                <li key={c.id} className="rounded-md border border-ink-200 p-3">
                  <div className="mb-1 text-xs text-ink-500">
                    <span className="font-medium text-ink-700">{c.author.name}</span>{" "}
                    · {fmtDate(c.createdAt)}
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-ink-800">{c.body}</div>
                </li>
              ))}
              {finding.comments_rel.length === 0 && (
                <li className="text-sm text-ink-500">No comments yet.</li>
              )}
            </ul>
            {canComment && (
              <form action={addCommentAction} className="mt-3 flex gap-2">
                <input type="hidden" name="findingId" value={finding.id} />
                <input
                  name="body"
                  placeholder="Add a comment for the team…"
                  className="input"
                  required
                />
                <button className="btn-primary shrink-0">Post</button>
              </form>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-700">Triage</h2>
            {!canUpdate && (
              <p className="text-sm text-ink-500">
                Your role has read-only access to finding status.
              </p>
            )}
            {canUpdate && (
            <form action={updateFindingAction} className="space-y-3">
              <input type="hidden" name="findingId" value={finding.id} />
              <div>
                <label className="label">Status</label>
                <select name="status" defaultValue={finding.status} className="input">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Assignee</label>
                <select name="assigneeId" defaultValue={finding.assigneeId ?? ""} className="input">
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <button className="btn-primary w-full">Save</button>
            </form>
            )}
          </div>

          <div className="card p-5 text-sm">
            <h2 className="mb-3 text-sm font-semibold text-ink-700">Context</h2>
            <Row label="System">
              <Link href={`/systems/${finding.systemId}`} className="hover:underline">
                {finding.system.acronym}
              </Link>
            </Row>
            <Row label="Asset">{finding.asset?.hostname ?? "—"}</Row>
            <Row label="First seen">{fmtDate(finding.firstSeen)}</Row>
            <Row label="Last seen">{fmtDate(finding.lastSeen)}</Row>
            <Row label="POA&M">
              {finding.poam ? (
                <Link href={`/poams/${finding.poam.id}`} className="font-mono hover:underline">
                  {poamNumber(finding.poam.number)}
                </Link>
              ) : (
                "—"
              )}
            </Row>
          </div>

          <div className="card p-5">
            <h2 className="mb-2 text-sm font-semibold text-ink-700">
              Mapped 800-53 controls
            </h2>
            <div className="flex flex-wrap gap-1">
              {finding.controls.map((c) => (
                <Link
                  key={c.controlId}
                  href={`/controls/${c.controlId}`}
                  className="rounded bg-ink-100 px-2 py-0.5 font-mono text-xs text-ink-700 hover:bg-ink-200"
                  title={c.control.title}
                >
                  {c.controlId}
                </Link>
              ))}
              {finding.controls.length === 0 && (
                <span className="text-xs text-ink-500">No control mapping.</span>
              )}
            </div>
            {finding.ccis.length > 0 && (
              <>
                <h3 className="mb-1 mt-3 text-xs font-semibold uppercase text-ink-500">
                  CCIs
                </h3>
                <div className="flex flex-wrap gap-1">
                  {finding.ccis.map((c) => (
                    <span key={c.id} className="rounded bg-blue-50 px-2 py-0.5 font-mono text-xs text-blue-700">
                      {c.id}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <DeviationCard
            findingId={finding.id}
            findingOpen={finding.status === "OPEN"}
            deviations={finding.deviations}
            canRequest={canUpdate}
            canDecide={sessionUser ? can(sessionUser.role, "risk:accept") : false}
          />
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="mb-2 text-sm font-semibold text-ink-700">{title}</h2>
      <p className="whitespace-pre-wrap text-sm text-ink-800">{children}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-ink-100 py-1.5 last:border-0">
      <span className="text-ink-500">{label}</span>
      <span className="text-ink-900">{children}</span>
    </div>
  );
}
