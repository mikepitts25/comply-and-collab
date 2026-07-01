"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/rbac-server";
import type { ControlStatus } from "@prisma/client";

/**
 * Create a POA&M for an assessed control deficiency (a baseline gap), as an
 * SCA would during an assessment — complements scan-derived POA&Ms.
 */
export async function createControlPoamAction(formData: FormData): Promise<void> {
  const user = await requireCapability("poam:generate");
  const systemId = String(formData.get("systemId") ?? "");
  const controlId = String(formData.get("controlId") ?? "");
  if (!systemId || !controlId) return;

  const control = await prisma.control.findUnique({
    where: { id: controlId },
    select: { id: true, title: true, baselineHigh: true, baselineModerate: true },
  });
  if (!control) return;

  // Avoid duplicate control-gap POA&Ms for the same control.
  const existing = await prisma.poam.findFirst({
    where: { systemId, controls: { some: { controlId } }, status: { notIn: ["COMPLETED", "CLOSED"] } },
    select: { id: true },
  });
  if (existing) return;

  const last = await prisma.poam.findFirst({
    where: { systemId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const severity = control.baselineHigh ? "HIGH" : control.baselineModerate ? "MEDIUM" : "LOW";
  const scheduled = new Date();
  scheduled.setDate(scheduled.getDate() + (severity === "HIGH" ? 90 : 180));

  await prisma.poam.create({
    data: {
      systemId,
      number: (last?.number ?? 0) + 1,
      weakness: `Security control not fully implemented: ${controlId} — ${control.title}`,
      sourceIdentifier: "Security Control Assessment",
      severity,
      riskRating: severity === "HIGH" ? "HIGH" : "MODERATE",
      recommendation: `Implement ${controlId} and document the implementation in the SSP.`,
      scheduledCompletion: scheduled,
      ownerId: user.id,
      controls: { create: [{ controlId }] },
      milestones: {
        create: [
          { description: `Design and implement ${controlId}` },
          { description: "Document implementation narrative in SSP" },
          { description: "Validate with assessor" },
        ],
      },
    },
  });
  await prisma.activity.create({
    data: {
      actorId: user.id,
      verb: "created",
      entity: "Poam",
      summary: `Created assessment POA&M for control gap ${controlId}.`,
    },
  });
  revalidatePath(`/systems/${systemId}/coverage`);
  revalidatePath("/poams");
}

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
