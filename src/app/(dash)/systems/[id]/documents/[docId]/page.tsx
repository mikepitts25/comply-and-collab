import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { allowedTransitions, isReviewDecision } from "@/lib/documents";
import { setDocumentStatusAction, addDocumentCommentAction } from "@/app/actions/documents";
import { NewVersionForm } from "../doc-forms";
import { DOC_STATUS_CLS, DOC_STATUS_LABEL } from "../status";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default async function DocumentDetail({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id, docId } = await params;
  const doc = await prisma.systemDocument.findUnique({
    where: { id: docId },
    include: {
      system: { select: { id: true, acronym: true } },
      createdBy: { select: { name: true } },
      reviewer: { select: { name: true } },
      versions: {
        orderBy: { versionNo: "desc" },
        include: { uploadedBy: { select: { name: true } } },
      },
      events: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true } } },
      },
    },
  });
  if (!doc || doc.system.id !== id) notFound();

  const user = await getSessionUser();
  const canDocument = user ? can(user.role, "control:document") : false;
  const canReview = user ? can(user.role, "mitigation:approve") : false;
  const canComment = user ? can(user.role, "comment:create") : false;

  const transitions = allowedTransitions(doc.status).filter((to) =>
    isReviewDecision(to) ? canReview : canDocument
  );

  return (
    <div className="space-y-6">
      <Link
        href={`/systems/${doc.system.id}/documents`}
        className="text-sm text-ink-500 hover:underline"
      >
        ← Back to documents
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${DOC_STATUS_CLS[doc.status]}`}>
              {DOC_STATUS_LABEL[doc.status]}
            </span>
            <span className="rounded bg-ink-100 px-2 py-0.5 text-xs text-ink-600">
              {doc.category[0] + doc.category.slice(1).toLowerCase()}
            </span>
          </div>
          <h1 className="text-xl font-semibold text-ink-900">{doc.title}</h1>
          <p className="mt-1 text-xs text-ink-500">
            Created by {doc.createdBy.name} · {fmtDate(doc.createdAt)}
            {doc.reviewer && <> · Reviewer: {doc.reviewer.name}</>}
          </p>
        </div>
      </div>

      {/* Review flow */}
      {transitions.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink-700">Review flow</h2>
          <div className="flex flex-wrap gap-3">
            {transitions.map((to) => (
              <form key={to} action={setDocumentStatusAction} className="flex items-center gap-2">
                <input type="hidden" name="documentId" value={doc.id} />
                <input type="hidden" name="systemId" value={doc.system.id} />
                <input type="hidden" name="to" value={to} />
                {(to === "APPROVED" || to === "CHANGES_REQUESTED") && (
                  <input
                    name="note"
                    placeholder="Review note (optional)"
                    aria-label={`Note for ${DOC_STATUS_LABEL[to]}`}
                    className="input w-56 py-1 text-xs"
                  />
                )}
                <button
                  className={
                    to === "APPROVED"
                      ? "btn-primary py-1.5 text-xs"
                      : "btn-ghost py-1.5 text-xs"
                  }
                >
                  {to === "IN_REVIEW" ? "Start review" : `Move to ${DOC_STATUS_LABEL[to]}`}
                </button>
              </form>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-500">
            Draft → Ready for review → In review → Approved / Changes requested. Uploading a
            new version to an approved document resets it to Draft.
          </p>
        </div>
      )}

      {/* Version history */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3 text-sm font-semibold text-ink-700">
          Version history ({doc.versions.length})
        </div>
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              <th className="th">Ver</th>
              <th className="th">File</th>
              <th className="th">What changed</th>
              <th className="th">By</th>
              <th className="th">When</th>
              <th className="th">SHA-256</th>
              <th className="th"><span className="sr-only">Download</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {doc.versions.map((v) => (
              <tr key={v.id} className="align-top hover:bg-ink-50">
                <td className="td font-mono text-xs">v{v.versionNo}</td>
                <td className="td text-xs">
                  {v.filename}
                  <div className="text-ink-500">{fmtSize(v.size)}</div>
                </td>
                <td className="td max-w-sm text-xs text-ink-700">{v.changeNote}</td>
                <td className="td text-xs">{v.uploadedBy.name}</td>
                <td className="td text-xs">{fmtDate(v.uploadedAt)}</td>
                <td className="td font-mono text-[10px] text-ink-500" title={v.sha256}>
                  {v.sha256.slice(0, 12)}…
                </td>
                <td className="td">
                  <a
                    href={`/api/documents/version/${v.id}`}
                    className="btn-ghost py-1 text-xs"
                    aria-label={`Download v${v.versionNo} of ${v.filename}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canDocument && doc.status !== "ARCHIVED" && (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink-700">Upload new version</h2>
          <NewVersionForm systemId={doc.system.id} documentId={doc.id} />
        </div>
      )}

      {/* Timeline */}
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink-700">
          Activity ({doc.events.length})
        </h2>
        <ul className="space-y-3">
          {doc.events.map((e) => (
            <li key={e.id} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink-300" />
              <div>
                <span className="font-medium text-ink-800">{e.actor.name}</span>{" "}
                {e.fromStatus && e.toStatus ? (
                  <span className="text-ink-600">
                    moved {DOC_STATUS_LABEL[e.fromStatus]} → {DOC_STATUS_LABEL[e.toStatus]}
                  </span>
                ) : e.toStatus ? (
                  <span className="text-ink-600">set status {DOC_STATUS_LABEL[e.toStatus]}</span>
                ) : (
                  <span className="text-ink-600">commented</span>
                )}
                {e.note && <div className="mt-0.5 whitespace-pre-wrap text-xs text-ink-700">{e.note}</div>}
                <div className="text-xs text-ink-500">{fmtDate(e.createdAt)}</div>
              </div>
            </li>
          ))}
        </ul>
        {canComment && (
          <form action={addDocumentCommentAction} className="mt-4 flex gap-2">
            <input type="hidden" name="documentId" value={doc.id} />
            <input type="hidden" name="systemId" value={doc.system.id} />
            <input name="note" placeholder="Add a comment…" aria-label="Comment" className="input" required />
            <button className="btn-primary shrink-0">Post</button>
          </form>
        )}
      </div>
    </div>
  );
}
