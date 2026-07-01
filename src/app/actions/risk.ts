"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/rbac-server";
import type { ImpactLevel } from "@prisma/client";

/** Record a formal risk acceptance for a POA&M and move it to RISK_ACCEPTED. */
export async function acceptRiskAction(formData: FormData): Promise<void> {
  const user = await requireCapability("risk:accept");
  const poamId = String(formData.get("poamId") ?? "");
  const authorizingOfficial = String(formData.get("authorizingOfficial") ?? "").trim();
  const rationale = String(formData.get("rationale") ?? "").trim();
  const residualRisk = String(formData.get("residualRisk") ?? "MODERATE") as ImpactLevel;
  const reviewByRaw = String(formData.get("reviewBy") ?? "");
  const reviewBy = reviewByRaw ? new Date(reviewByRaw) : null;
  if (!poamId || !authorizingOfficial || !rationale) return;

  await prisma.riskAcceptance.upsert({
    where: { poamId },
    create: { poamId, acceptedById: user.id, authorizingOfficial, rationale, residualRisk, reviewBy },
    update: { acceptedById: user.id, authorizingOfficial, rationale, residualRisk, reviewBy, acceptedAt: new Date() },
  });
  await prisma.poam.update({
    where: { id: poamId },
    data: { status: "RISK_ACCEPTED", residualRisk },
  });
  await prisma.activity.create({
    data: {
      actorId: user.id,
      verb: "accepted risk",
      entity: "Poam",
      entityId: poamId,
      summary: `Risk accepted (AO: ${authorizingOfficial}, residual ${residualRisk.toLowerCase()}).`,
    },
  });
  revalidatePath(`/poams/${poamId}`);
  revalidatePath("/poams");
}

/** Rescind a risk acceptance and return the POA&M to ongoing. */
export async function revokeRiskAcceptanceAction(formData: FormData): Promise<void> {
  const user = await requireCapability("risk:accept");
  const poamId = String(formData.get("poamId") ?? "");
  if (!poamId) return;
  await prisma.riskAcceptance.deleteMany({ where: { poamId } });
  await prisma.poam.update({ where: { id: poamId }, data: { status: "ONGOING" } });
  await prisma.activity.create({
    data: { actorId: user.id, verb: "rescinded risk acceptance", entity: "Poam", entityId: poamId, summary: "Rescinded a risk acceptance; POA&M returned to ongoing." },
  });
  revalidatePath(`/poams/${poamId}`);
  revalidatePath("/poams");
}
