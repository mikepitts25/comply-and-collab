import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { NewDocumentForm } from "./doc-forms";
import { DOC_STATUS_CLS } from "./status";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
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
      documents: {
        orderBy: { updatedAt: "desc" },
        include: {
          createdBy: { select: { name: true } },
          reviewer: { select: { name: true } },
          versions: {
            orderBy: { versionNo: "desc" },
            take: 1,
            include: { uploadedBy: { select: { name: true } } },
          },
        },
      },
    },
  });
  if (!system) notFound();

  const user = await getSessionUser();
  const canDocument = user ? can(user.role, "control:document") : false;

  return (
    <div className="space-y-6">
      <Link href={`/systems/${system.id}`} className="text-sm text-ink-500 hover:underline">
        ← Back to {system.acronym}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Document Library</h1>
        <p className="text-sm text-ink-500">
          {system.acronym} — versioned ATO-package documents with change tracking and a
          review workflow (Draft → Ready for review → In review → Approved).
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              <th className="th">Document</th>
              <th className="th">Category</th>
              <th className="th">Version</th>
              <th className="th">Last change</th>
              <th className="th">Reviewer</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {system.documents.map((d) => {
              const v = d.versions[0];
              return (
                <tr key={d.id} className="align-top hover:bg-ink-50">
                  <td className="td">
                    <Link
                      href={`/systems/${system.id}/documents/${d.id}`}
                      className="font-medium text-ink-900 hover:underline"
                    >
                      {d.title}
                    </Link>
                    <div className="text-xs text-ink-500">{v?.filename}</div>
                  </td>
                  <td className="td text-xs">{d.category[0] + d.category.slice(1).toLowerCase()}</td>
                  <td className="td text-xs">v{v?.versionNo ?? 0}</td>
                  <td className="td max-w-sm text-xs text-ink-600">
                    {v ? (
                      <>
                        {v.changeNote}
                        <div className="mt-0.5 text-ink-500">
                          {v.uploadedBy.name} · {fmtDate(v.uploadedAt)}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="td text-xs">{d.reviewer?.name ?? "—"}</td>
                  <td className="td">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${DOC_STATUS_CLS[d.status]}`}>
                      {d.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
            {system.documents.length === 0 && (
              <tr>
                <td className="td text-ink-500" colSpan={6}>
                  No documents yet — replace that shared-drive folder below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canDocument && (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink-700">Add document</h2>
          <NewDocumentForm systemId={system.id} />
        </div>
      )}
    </div>
  );
}
