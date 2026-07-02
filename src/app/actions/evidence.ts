"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/rbac-server";
import { addEvidence, validateEvidenceFile } from "@/lib/evidence";

export type EvidenceState = { ok?: boolean; error?: string };

export async function uploadEvidenceAction(
  _prev: EvidenceState | undefined,
  formData: FormData
): Promise<EvidenceState> {
  const user = await requireCapability("control:document");
  const systemControlId = String(formData.get("systemControlId") ?? "");
  const systemId = String(formData.get("systemId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  if (!systemControlId || !description) {
    return { error: "A description is required." };
  }

  let file: { name: string; type: string; bytes: Uint8Array } | null = null;
  const f = formData.get("file");
  if (f && typeof f === "object" && "arrayBuffer" in f && (f as File).size > 0) {
    const blob = f as File;
    const err = validateEvidenceFile(blob.size, blob.name);
    if (err) return { error: err };
    file = {
      name: blob.name,
      type: blob.type || "application/octet-stream",
      bytes: new Uint8Array(await blob.arrayBuffer()),
    };
  }

  await addEvidence({ systemControlId, description, userId: user.id, file });
  revalidatePath(`/systems/${systemId}/evidence`);
  return { ok: true };
}

export async function deleteEvidenceAction(formData: FormData): Promise<void> {
  const user = await requireCapability("control:document");
  const id = String(formData.get("id") ?? "");
  const systemId = String(formData.get("systemId") ?? "");
  if (!id) return;
  const ev = await prisma.evidence.delete({
    where: { id },
    include: { systemControl: { select: { controlId: true } } },
  });
  await prisma.activity.create({
    data: {
      actorId: user.id,
      verb: "removed",
      entity: "Evidence",
      entityId: id,
      summary: `Removed evidence from ${ev.systemControl.controlId}.`,
    },
  });
  revalidatePath(`/systems/${systemId}/evidence`);
}
