"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/rbac-server";
import type { ControlStatus } from "@prisma/client";

/** Create or update a system's implementation narrative + status for a control. */
export async function documentControlAction(formData: FormData): Promise<void> {
  const user = await requireCapability("control:document");
  const systemId = String(formData.get("systemId") ?? "");
  const controlId = String(formData.get("controlId") ?? "");
  const status = String(formData.get("status") ?? "PLANNED") as ControlStatus;
  const narrative = String(formData.get("narrative") ?? "").trim() || null;
  if (!systemId || !controlId) return;

  await prisma.systemControl.upsert({
    where: { systemId_controlId: { systemId, controlId } },
    create: { systemId, controlId, status, narrative },
    update: { status, narrative },
  });
  await prisma.activity.create({
    data: {
      actorId: user.id,
      verb: "documented",
      entity: "SystemControl",
      entityId: controlId,
      summary: `Documented ${controlId} as ${status.replace(/_/g, " ")}.`,
    },
  });
  revalidatePath(`/systems/${systemId}/coverage`);
}
