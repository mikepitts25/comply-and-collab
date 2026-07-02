// Finding deviation workflow: request (analyst/engineer) -> decision (senior
// role holding risk:accept). Approval retires the finding with the status
// matching the deviation type; the full request/decision trail is preserved.

import { prisma } from "./db";
import type { DeviationType, FindingStatus } from "@prisma/client";

/** Finding status applied when a deviation of the given type is approved. */
export function findingStatusForApprovedDeviation(type: DeviationType): FindingStatus {
  return type === "FALSE_POSITIVE" ? "NOT_A_FINDING" : "NOT_APPLICABLE";
}

export async function requestDeviation(args: {
  findingId: string;
  type: DeviationType;
  justification: string;
  evidence?: string;
  userId: string;
}) {
  const { findingId, type, justification, evidence, userId } = args;

  const pending = await prisma.deviation.findFirst({
    where: { findingId, status: "PENDING" },
    select: { id: true },
  });
  if (pending) throw new Error("A deviation request is already pending for this finding.");

  const deviation = await prisma.deviation.create({
    data: { findingId, type, justification, evidence: evidence || null, requestedById: userId },
  });

  await prisma.activity.create({
    data: {
      actorId: userId,
      verb: "requested",
      entity: "Deviation",
      entityId: deviation.id,
      summary: `Requested ${type.replace(/_/g, " ").toLowerCase()} deviation on a finding.`,
    },
  });
  return deviation;
}

export async function decideDeviation(args: {
  deviationId: string;
  approve: boolean;
  userId: string;
  note?: string;
}) {
  const { deviationId, approve, userId, note } = args;

  const deviation = await prisma.deviation.findUnique({
    where: { id: deviationId },
    include: { finding: { select: { id: true } } },
  });
  if (!deviation) throw new Error("Deviation not found.");
  if (deviation.status !== "PENDING") throw new Error("Deviation has already been decided.");

  const updated = await prisma.deviation.update({
    where: { id: deviationId },
    data: {
      status: approve ? "APPROVED" : "REJECTED",
      decidedById: userId,
      decidedAt: new Date(),
      decisionNote: note || null,
    },
  });

  if (approve) {
    await prisma.finding.update({
      where: { id: deviation.finding.id },
      data: {
        status: findingStatusForApprovedDeviation(deviation.type),
        closedAt: new Date(),
      },
    });
  }

  await prisma.activity.create({
    data: {
      actorId: userId,
      verb: approve ? "approved" : "rejected",
      entity: "Deviation",
      entityId: deviationId,
      summary: `${approve ? "Approved" : "Rejected"} a ${deviation.type
        .replace(/_/g, " ")
        .toLowerCase()} deviation request.`,
    },
  });
  return updated;
}
