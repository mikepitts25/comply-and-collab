"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/rbac-server";
import type { Prisma } from "@prisma/client";

const BASELINE_FILTER: Record<string, Prisma.ControlWhereInput> = {
  LOW: { baselineLow: true },
  MODERATE: { baselineModerate: true },
  HIGH: { baselineHigh: true },
};

/**
 * Inherit a common control provider's implemented controls into a subscribing
 * system: for each provider control that falls in the subscriber's baseline
 * and isn't already documented, create an INHERITED SystemControl.
 */
export async function inheritControlsAction(formData: FormData): Promise<void> {
  const user = await requireCapability("control:document");
  const systemId = String(formData.get("systemId") ?? "");
  const providerId = String(formData.get("providerId") ?? "");
  if (!systemId || !providerId || systemId === providerId) return;

  const [subscriber, provider] = await Promise.all([
    prisma.system.findUnique({ where: { id: systemId }, select: { categorization: true } }),
    prisma.system.findUnique({ where: { id: providerId }, select: { acronym: true, isCommonControlProvider: true } }),
  ]);
  if (!subscriber || !provider || !provider.isCommonControlProvider) return;

  // Controls the provider actually implements/inherits (its offered set).
  const offered = await prisma.systemControl.findMany({
    where: { systemId: providerId, status: { in: ["IMPLEMENTED", "INHERITED"] } },
    select: { controlId: true },
  });
  const offeredIds = offered.map((o) => o.controlId);
  if (offeredIds.length === 0) return;

  // Restrict to the subscriber's baseline.
  const baseline = await prisma.control.findMany({
    where: { AND: [BASELINE_FILTER[subscriber.categorization], { id: { in: offeredIds } }] },
    select: { id: true },
  });
  // Exclude controls the subscriber already documents.
  const already = new Set(
    (await prisma.systemControl.findMany({ where: { systemId, controlId: { in: baseline.map((b) => b.id) } }, select: { controlId: true } })).map((s) => s.controlId)
  );

  const toCreate = baseline.filter((b) => !already.has(b.id));
  if (toCreate.length === 0) return;

  await prisma.systemControl.createMany({
    data: toCreate.map((b) => ({
      systemId,
      controlId: b.id,
      status: "INHERITED" as const,
      inheritedFrom: provider.acronym,
      narrative: `Inherited from common control provider ${provider.acronym}.`,
    })),
    skipDuplicates: true,
  });
  await prisma.activity.create({
    data: {
      actorId: user.id,
      verb: "inherited",
      entity: "SystemControl",
      summary: `Inherited ${toCreate.length} common control(s) from ${provider.acronym}.`,
    },
  });
  revalidatePath(`/systems/${systemId}/coverage`);
}
