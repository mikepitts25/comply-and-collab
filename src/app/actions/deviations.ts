"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/rbac-server";
import { requestDeviation, decideDeviation } from "@/lib/deviations";
import type { DeviationType } from "@prisma/client";

export async function requestDeviationAction(formData: FormData): Promise<void> {
  const user = await requireCapability("finding:update");
  const findingId = String(formData.get("findingId") ?? "");
  const type = String(formData.get("type") ?? "") as DeviationType;
  const justification = String(formData.get("justification") ?? "").trim();
  const evidence = String(formData.get("evidence") ?? "").trim();
  if (!findingId || !justification) return;
  if (type !== "FALSE_POSITIVE" && type !== "OPERATIONAL_REQUIREMENT") return;

  await requestDeviation({ findingId, type, justification, evidence, userId: user.id });
  revalidatePath(`/findings/${findingId}`);
}

export async function decideDeviationAction(formData: FormData): Promise<void> {
  const user = await requireCapability("risk:accept");
  const deviationId = String(formData.get("deviationId") ?? "");
  const findingId = String(formData.get("findingId") ?? "");
  const approve = String(formData.get("decision")) === "approve";
  const note = String(formData.get("note") ?? "").trim();
  if (!deviationId) return;

  await decideDeviation({ deviationId, approve, userId: user.id, note });
  revalidatePath(`/findings/${findingId}`);
  revalidatePath("/findings");
}
