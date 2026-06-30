"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/rbac-server";
import { ForbiddenError } from "@/lib/rbac";
import { ingestScan } from "@/lib/ingest";
import { generatePoams } from "@/lib/poam";

export type ImportState = {
  ok?: boolean;
  error?: string;
  results?: Array<{
    filename: string;
    scanType: string;
    assets: number;
    total: number;
    open: number;
    isNew: number;
    closed: number;
  }>;
};

export async function importScansAction(
  _prev: ImportState | undefined,
  formData: FormData
): Promise<ImportState> {
  let user;
  try {
    user = await requireCapability("scan:import");
  } catch (e) {
    if (e instanceof ForbiddenError) return { error: e.message };
    throw e;
  }
  const systemId = String(formData.get("systemId") ?? "");
  if (!systemId) return { error: "Select a system." };

  const files = formData.getAll("files").filter(Boolean) as File[];
  if (files.length === 0) return { error: "Choose at least one scan file." };

  const results: NonNullable<ImportState["results"]> = [];
  try {
    for (const file of files) {
      const content = await file.text();
      const res = await ingestScan({
        systemId,
        userId: user.id,
        filename: file.name,
        content,
      });
      results.push({
        filename: file.name,
        scanType: res.scanType,
        assets: res.assets,
        total: res.totalFindings,
        open: res.openFindings,
        isNew: res.newFindings,
        closed: res.closedFindings,
      });
    }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to parse scan file.",
      results,
    };
  }

  revalidatePath("/findings");
  revalidatePath("/");
  return { ok: true, results };
}

export async function generatePoamsAction(formData: FormData): Promise<void> {
  const user = await requireCapability("poam:generate");
  const systemId = String(formData.get("systemId") ?? "");
  if (!systemId) return;
  await generatePoams(systemId, user.id);
  revalidatePath("/poams");
  revalidatePath(`/systems/${systemId}`);
  revalidatePath("/");
}
