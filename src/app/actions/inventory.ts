"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/rbac-server";
import type { SoftwareType, Protocol, FlowDirection, PpsmStatus } from "@prisma/client";

export async function addSoftwareAction(formData: FormData): Promise<void> {
  await requireCapability("inventory:manage");
  const assetId = String(formData.get("assetId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!assetId || !name) return;

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { systemId: true },
  });
  if (!asset) return;

  await prisma.softwareComponent.create({
    data: {
      assetId,
      name,
      version: String(formData.get("version") ?? "").trim() || null,
      vendor: String(formData.get("vendor") ?? "").trim() || null,
      type: (String(formData.get("type") || "APPLICATION") as SoftwareType),
    },
  });
  revalidatePath(`/systems/${asset.systemId}`);
}

export async function deleteSoftwareAction(formData: FormData): Promise<void> {
  await requireCapability("inventory:manage");
  const id = String(formData.get("id") ?? "");
  const systemId = String(formData.get("systemId") ?? "");
  if (!id) return;
  await prisma.softwareComponent.delete({ where: { id } });
  revalidatePath(`/systems/${systemId}`);
}

export async function addPpsmAction(formData: FormData): Promise<void> {
  await requireCapability("inventory:manage");
  const systemId = String(formData.get("systemId") ?? "");
  const port = String(formData.get("port") ?? "").trim();
  const service = String(formData.get("service") ?? "").trim();
  if (!systemId || !port || !service) return;

  await prisma.ppsmEntry.create({
    data: {
      systemId,
      port,
      service,
      protocol: (String(formData.get("protocol") || "TCP") as Protocol),
      direction: (String(formData.get("direction") || "INBOUND") as FlowDirection),
      boundary: String(formData.get("boundary") ?? "").trim() || null,
      classification: String(formData.get("classification") ?? "").trim() || null,
      status: (String(formData.get("status") || "PENDING") as PpsmStatus),
      justification: String(formData.get("justification") ?? "").trim() || null,
    },
  });
  revalidatePath(`/systems/${systemId}`);
}

export async function deletePpsmAction(formData: FormData): Promise<void> {
  await requireCapability("inventory:manage");
  const id = String(formData.get("id") ?? "");
  const systemId = String(formData.get("systemId") ?? "");
  if (!id) return;
  await prisma.ppsmEntry.delete({ where: { id } });
  revalidatePath(`/systems/${systemId}`);
}
