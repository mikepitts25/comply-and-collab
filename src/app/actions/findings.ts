"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { FindingStatus } from "@prisma/client";

export async function addCommentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const findingId = String(formData.get("findingId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  await prisma.comment.create({
    data: { body, authorId: user.id, findingId },
  });
  await prisma.activity.create({
    data: {
      actorId: user.id,
      verb: "commented",
      entity: "Finding",
      entityId: findingId,
      summary: `Commented on a finding.`,
    },
  });
  revalidatePath(`/findings/${findingId}`);
}

export async function updateFindingAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const findingId = String(formData.get("findingId"));
  const status = String(formData.get("status")) as FindingStatus;
  const assigneeId = String(formData.get("assigneeId") || "");

  await prisma.finding.update({
    where: { id: findingId },
    data: {
      status,
      assigneeId: assigneeId || null,
    },
  });
  await prisma.activity.create({
    data: {
      actorId: user.id,
      verb: "updated",
      entity: "Finding",
      entityId: findingId,
      summary: `Set finding status to ${status.replace(/_/g, " ")}.`,
    },
  });
  revalidatePath(`/findings/${findingId}`);
  revalidatePath(`/findings`);
}
