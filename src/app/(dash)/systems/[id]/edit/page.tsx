import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { updateSystemAction } from "@/app/actions/systems";
import { SystemFields } from "../../system-fields";

export const dynamic = "force-dynamic";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function EditSystemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!can(user.role, "system:manage")) redirect(`/systems/${id}`);

  const s = await prisma.system.findUnique({ where: { id } });
  if (!s) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href={`/systems/${s.id}`} className="text-sm text-ink-500 hover:underline">← Back to {s.acronym}</Link>
      <h1 className="text-2xl font-semibold text-ink-900">Edit {s.acronym}</h1>
      <div className="card p-6">
        <form action={updateSystemAction} className="space-y-4">
          <input type="hidden" name="id" value={s.id} />
          <SystemFields
            d={{
              name: s.name,
              acronym: s.acronym,
              description: s.description,
              confidentiality: s.confidentiality,
              integrity: s.integrity,
              availability: s.availability,
              frameworks: s.frameworks,
              authorizationStatus: s.authorizationStatus,
              atoDate: iso(s.atoDate),
              atoExpiration: iso(s.atoExpiration),
              authorizingOfficial: s.authorizingOfficial,
              isCommonControlProvider: s.isCommonControlProvider,
            }}
          />
          <div className="flex justify-end gap-2">
            <Link href={`/systems/${s.id}`} className="btn-ghost">Cancel</Link>
            <button type="submit" className="btn-primary">Save changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
