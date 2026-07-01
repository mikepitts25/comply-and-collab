"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/rbac-server";
import type { FindingStatus } from "@prisma/client";

export async function addCommentAction(formData: FormData): Promise<void> {
  const user = await requireCapability("comment:create");
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

/** Apply a status and/or assignee to many findings at once. */
export async function bulkUpdateFindingsAction(formData: FormData): Promise<void> {
  const user = await requireCapability("finding:update");
  const ids = formData.getAll("findingIds").map(String).filter(Boolean);
  if (ids.length === 0) return;

  const status = String(formData.get("status") || ""); // "" = leave unchanged
  const assignee = String(formData.get("assigneeId") || "__keep__");

  const data: { status?: FindingStatus; assigneeId?: string | null; closedAt?: Date | null } = {};
  if (status) {
    data.status = status as FindingStatus;
    if (status === "CLOSED") data.closedAt = new Date();
    else if (status === "OPEN") data.closedAt = null;
  }
  if (assignee !== "__keep__") data.assigneeId = assignee || null;
  if (Object.keys(data).length === 0) return;

  const res = await prisma.finding.updateMany({ where: { id: { in: ids } }, data });
  await prisma.activity.create({
    data: {
      actorId: user.id,
      verb: "bulk updated",
      entity: "Finding",
      summary:
        `Bulk updated ${res.count} finding(s)` +
        (data.status ? ` → ${(data.status as string).replace(/_/g, " ")}` : "") +
        (assignee !== "__keep__" ? ` (assignee changed)` : "") + ".",
    },
  });
  revalidatePath("/findings");
}

export async function updateFindingAction(formData: FormData): Promise<void> {
  const user = await requireCapability("finding:update");
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
