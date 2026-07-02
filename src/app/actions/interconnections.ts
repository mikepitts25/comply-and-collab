"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/rbac-server";
import type { AgreementType, FlowDirection, InterconnectionStatus } from "@prisma/client";

const AGREEMENTS: AgreementType[] = ["ISA", "MOU", "MOA", "SLA", "OTHER"];
const STATUSES: InterconnectionStatus[] = ["PLANNED", "PENDING_APPROVAL", "ACTIVE", "EXPIRED", "TERMINATED"];
const DIRECTIONS: FlowDirection[] = ["INBOUND", "OUTBOUND", "BIDIRECTIONAL"];

function dateOrNull(v: FormDataEntryValue | null): Date | null {
  const s = String(v ?? "").trim();
  return s ? new Date(s) : null;
}

export async function createInterconnectionAction(formData: FormData): Promise<void> {
  const user = await requireCapability("system:manage");
  const systemId = String(formData.get("systemId") ?? "");
  const remoteName = String(formData.get("remoteName") ?? "").trim();
  const connectionType = String(formData.get("connectionType") ?? "").trim();
  if (!systemId || !remoteName || !connectionType) return;

  const agreementType = String(formData.get("agreementType") ?? "ISA") as AgreementType;
  const direction = String(formData.get("direction") ?? "BIDIRECTIONAL") as FlowDirection;
  const status = String(formData.get("status") ?? "PENDING_APPROVAL") as InterconnectionStatus;

  await prisma.interconnection.create({
    data: {
      systemId,
      remoteName,
      remoteOwner: String(formData.get("remoteOwner") ?? "").trim() || null,
      connectionType,
      direction: DIRECTIONS.includes(direction) ? direction : "BIDIRECTIONAL",
      dataDescription: String(formData.get("dataDescription") ?? "").trim() || null,
      classification: String(formData.get("classification") ?? "").trim() || null,
      agreementType: AGREEMENTS.includes(agreementType) ? agreementType : "ISA",
      status: STATUSES.includes(status) ? status : "PENDING_APPROVAL",
      agreementDate: dateOrNull(formData.get("agreementDate")),
      expiresAt: dateOrNull(formData.get("expiresAt")),
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });
  await prisma.activity.create({
    data: {
      actorId: user.id,
      verb: "created",
      entity: "Interconnection",
      entityId: systemId,
      summary: `Documented interconnection with ${remoteName}.`,
    },
  });
  revalidatePath(`/systems/${systemId}/interconnections`);
}

export async function updateInterconnectionStatusAction(formData: FormData): Promise<void> {
  await requireCapability("system:manage");
  const id = String(formData.get("id") ?? "");
  const systemId = String(formData.get("systemId") ?? "");
  const status = String(formData.get("status") ?? "") as InterconnectionStatus;
  if (!id || !STATUSES.includes(status)) return;
  await prisma.interconnection.update({ where: { id }, data: { status } });
  revalidatePath(`/systems/${systemId}/interconnections`);
}

export async function deleteInterconnectionAction(formData: FormData): Promise<void> {
  await requireCapability("system:manage");
  const id = String(formData.get("id") ?? "");
  const systemId = String(formData.get("systemId") ?? "");
  if (!id) return;
  await prisma.interconnection.delete({ where: { id } });
  revalidatePath(`/systems/${systemId}/interconnections`);
}
