import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { deleteEvidenceAction } from "@/app/actions/evidence";
import { UploadEvidence } from "./upload-form";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

function fmtSize(n: number): string {
  if (n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default async function EvidencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const system = await prisma.system.findUnique({
    where: { id },
    select: {
      id: true,
      acronym: true,
      controls: {
        orderBy: { controlId: "asc" },
        select: {
          id: true,
          controlId: true,
          status: true,
          evidence: {
            orderBy: { uploadedAt: "desc" },
            include: { uploadedBy: { select: { name: true } } },
          },
        },
      },
    },
  });
  if (!system) notFound();

  const user = await getSessionUser();
  const canDocument = user ? can(user.role, "control:document") : false;
  const total = system.controls.reduce((n, c) => n + c.evidence.length, 0);
  const withEvidence = system.controls.filter((c) => c.evidence.length > 0);

  return (
    <div className="space-y-6">
      <Link href={`/systems/${system.id}`} className="text-sm text-ink-500 hover:underline">
        ← Back to {system.acronym}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Control Evidence</h1>
        <p className="text-sm text-ink-500">
          {system.acronym} — assessment artifacts backing documented controls
          ({total} artifact{total === 1 ? "" : "s"} across {withEvidence.length} of{" "}
          {system.controls.length} documented controls). Stored in the database;
          integrity-hashed (SHA-256).
        </p>
      </div>

      {canDocument && (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink-700">Attach evidence</h2>
          <UploadEvidence
            systemId={system.id}
            controls={system.controls.map((c) => ({ id: c.id, controlId: c.controlId }))}
          />
          {system.controls.length === 0 && (
            <p className="mt-2 text-sm text-ink-500">
              Document controls first (Coverage → narrative) — evidence attaches to a
              documented control.
            </p>
          )}
        </div>
      )}

      {withEvidence.map((c) => (
        <div key={c.id} className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50 px-5 py-2">
            <Link href={`/controls/${c.controlId}`} className="font-mono text-sm font-semibold text-ink-800 hover:underline">
              {c.controlId}
            </Link>
            <span className="text-xs text-ink-500">{c.status.replace(/_/g, " ")}</span>
          </div>
          <ul className="divide-y divide-ink-100">
            {c.evidence.map((ev) => (
              <li key={ev.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="text-sm text-ink-800">{ev.description}</div>
                  <div className="mt-0.5 text-xs text-ink-400">
                    {ev.filename ? `${ev.filename} · ${fmtSize(ev.size)} · ` : ""}
                    {ev.uploadedBy.name} · {fmtDate(ev.uploadedAt)}
                    {ev.sha256 && (
                      <span className="ml-1 font-mono text-[10px]" title={ev.sha256}>
                        sha256:{ev.sha256.slice(0, 12)}…
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {ev.filename && (
                    <a href={`/api/evidence/${ev.id}`} className="btn-ghost py-1 text-xs" title="Download">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {canDocument && (
                    <form action={deleteEvidenceAction}>
                      <input type="hidden" name="id" value={ev.id} />
                      <input type="hidden" name="systemId" value={system.id} />
                      <button className="btn-ghost py-1 text-xs text-red-600" title="Remove">✕</button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {withEvidence.length === 0 && (
        <p className="text-sm text-ink-500">No evidence attached yet.</p>
      )}
    </div>
  );
}
