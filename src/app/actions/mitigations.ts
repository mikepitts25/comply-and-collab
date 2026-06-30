"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/rbac-server";

export async function createMitigationAction(formData: FormData): Promise<void> {
  const user = await requireCapability("mitigation:create");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const controlId = String(formData.get("controlId") || "");
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (!title || !body) return;

  await prisma.mitigationStatement.create({
    data: {
      title,
      body,
      tags,
      authorId: user.id,
      controlLinks: controlId ? { create: [{ controlId }] } : undefined,
    },
  });
  revalidatePath("/mitigations");
}
