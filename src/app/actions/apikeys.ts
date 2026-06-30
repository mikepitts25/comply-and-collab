"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/rbac-server";
import { ForbiddenError } from "@/lib/rbac";
import { generateApiKey } from "@/lib/apikey";

export type CreateKeyState = {
  plaintext?: string;
  prefix?: string;
  error?: string;
};

export async function createApiKeyAction(
  _prev: CreateKeyState | undefined,
  formData: FormData
): Promise<CreateKeyState> {
  let user;
  try {
    user = await requireCapability("apikey:manage");
  } catch (e) {
    if (e instanceof ForbiddenError) return { error: e.message };
    throw e;
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the key a name." };
  // Optionally issue the key on behalf of a specific user (defaults to self).
  const ownerId = String(formData.get("ownerId") || user.id);

  const { plaintext, prefix, hash } = generateApiKey();
  await prisma.apiKey.create({ data: { name, prefix, hash, userId: ownerId } });
  await prisma.activity.create({
    data: {
      actorId: user.id,
      verb: "created",
      entity: "ApiKey",
      summary: `Created API key "${name}" (${prefix}).`,
    },
  });

  revalidatePath("/settings/api-keys");
  return { plaintext, prefix };
}

export async function revokeApiKeyAction(formData: FormData): Promise<void> {
  const user = await requireCapability("apikey:manage");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  await prisma.activity.create({
    data: {
      actorId: user.id,
      verb: "revoked",
      entity: "ApiKey",
      entityId: id,
      summary: "Revoked an API key.",
    },
  });
  revalidatePath("/settings/api-keys");
}
