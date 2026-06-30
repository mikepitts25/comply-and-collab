"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/rbac-server";
import type { PoamStatus, ImpactLevel } from "@prisma/client";

export async function updatePoamAction(formData: FormData): Promise<void> {
  const user = await requireCapability("poam:update");
  const poamId = String(formData.get("poamId"));
  const status = String(formData.get("status")) as PoamStatus;
  const ownerId = String(formData.get("ownerId") || "");
  const residualRisk = String(formData.get("residualRisk") || "") as ImpactLevel | "";

  const completed = ["COMPLETED", "CLOSED"].includes(status);

  await prisma.poam.update({
    where: { id: poamId },
    data: {
      status,
      ownerId: ownerId || null,
      residualRisk: residualRisk || null,
      actualCompletion: completed ? new Date() : null,
    },
  });
  await prisma.activity.create({
    data: {
      actorId: user.id,
      verb: "updated",
      entity: "Poam",
      entityId: poamId,
      summary: `Set POA&M status to ${status.replace(/_/g, " ")}.`,
    },
  });
  revalidatePath(`/poams/${poamId}`);
  revalidatePath("/poams");
}

export async function toggleMilestoneAction(formData: FormData): Promise<void> {
  await requireCapability("poam:milestone");
  const milestoneId = String(formData.get("milestoneId"));
  const poamId = String(formData.get("poamId"));
  const completed = String(formData.get("completed")) === "true";

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { completed: !completed, completedAt: !completed ? new Date() : null },
  });
  revalidatePath(`/poams/${poamId}`);
}

export async function attachMitigationAction(formData: FormData): Promise<void> {
  const user = await requireCapability("poam:update");
  const poamId = String(formData.get("poamId"));
  const mitigationId = String(formData.get("mitigationId") || "");
  if (!mitigationId) return;

  await prisma.poam.update({
    where: { id: poamId },
    data: { mitigations: { connect: { id: mitigationId } } },
  });
  await prisma.activity.create({
    data: {
      actorId: user.id,
      verb: "attached",
      entity: "Poam",
      entityId: poamId,
      summary: "Attached a mitigation statement to a POA&M.",
    },
  });
  revalidatePath(`/poams/${poamId}`);
}

export async function addPoamCommentAction(formData: FormData): Promise<void> {
  const user = await requireCapability("comment:create");
  const poamId = String(formData.get("poamId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await prisma.comment.create({ data: { body, authorId: user.id, poamId } });
  revalidatePath(`/poams/${poamId}`);
}
