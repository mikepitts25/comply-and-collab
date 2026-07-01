"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/rbac-server";
import { ForbiddenError } from "@/lib/rbac";
import type { ImpactLevel, AuthorizationStatus, Framework } from "@prisma/client";

const RANK: Record<ImpactLevel, number> = { LOW: 0, MODERATE: 1, HIGH: 2 };
const LEVELS: ImpactLevel[] = ["LOW", "MODERATE", "HIGH"];

/** FIPS 199 high-water mark across C/I/A. */
function highWater(c: ImpactLevel, i: ImpactLevel, a: ImpactLevel): ImpactLevel {
  return LEVELS[Math.max(RANK[c], RANK[i], RANK[a])];
}

function readImpact(fd: FormData, key: string): ImpactLevel {
  const v = String(fd.get(key) || "MODERATE");
  return (LEVELS as string[]).includes(v) ? (v as ImpactLevel) : "MODERATE";
}

function readDate(fd: FormData, key: string): Date | null {
  const v = String(fd.get(key) || "");
  return v ? new Date(v) : null;
}

export type SystemFormState = { error?: string };

export async function createSystemAction(
  _prev: SystemFormState | undefined,
  fd: FormData
): Promise<SystemFormState> {
  try {
    await requireCapability("system:manage");
  } catch (e) {
    if (e instanceof ForbiddenError) return { error: e.message };
    throw e;
  }
  const name = String(fd.get("name") || "").trim();
  const acronym = String(fd.get("acronym") || "").trim().toUpperCase();
  if (!name || !acronym) return { error: "Name and acronym are required." };

  const c = readImpact(fd, "confidentiality");
  const i = readImpact(fd, "integrity");
  const a = readImpact(fd, "availability");
  const frameworks = fd.getAll("frameworks").map(String) as Framework[];

  let created;
  try {
    created = await prisma.system.create({
      data: {
        name,
        acronym,
        description: String(fd.get("description") || "").trim() || null,
        confidentiality: c,
        integrity: i,
        availability: a,
        categorization: highWater(c, i, a),
        frameworks: frameworks.length ? frameworks : ["RMF_800_53"],
        authorizationStatus: (String(fd.get("authorizationStatus") || "IN_PROGRESS") as AuthorizationStatus),
        atoDate: readDate(fd, "atoDate"),
        atoExpiration: readDate(fd, "atoExpiration"),
        authorizingOfficial: String(fd.get("authorizingOfficial") || "").trim() || null,
        isCommonControlProvider: fd.get("isCommonControlProvider") === "on",
      },
    });
  } catch {
    return { error: `A system with acronym "${acronym}" may already exist.` };
  }
  revalidatePath("/systems");
  redirect(`/systems/${created.id}`);
}

export async function updateSystemAction(fd: FormData): Promise<void> {
  await requireCapability("system:manage");
  const id = String(fd.get("id") || "");
  if (!id) return;
  const c = readImpact(fd, "confidentiality");
  const i = readImpact(fd, "integrity");
  const a = readImpact(fd, "availability");
  const frameworks = fd.getAll("frameworks").map(String) as Framework[];

  await prisma.system.update({
    where: { id },
    data: {
      name: String(fd.get("name") || "").trim(),
      description: String(fd.get("description") || "").trim() || null,
      confidentiality: c,
      integrity: i,
      availability: a,
      categorization: highWater(c, i, a),
      frameworks: frameworks.length ? frameworks : undefined,
      authorizationStatus: (String(fd.get("authorizationStatus") || "IN_PROGRESS") as AuthorizationStatus),
      atoDate: readDate(fd, "atoDate"),
      atoExpiration: readDate(fd, "atoExpiration"),
      authorizingOfficial: String(fd.get("authorizingOfficial") || "").trim() || null,
      isCommonControlProvider: fd.get("isCommonControlProvider") === "on",
    },
  });
  revalidatePath(`/systems/${id}`);
  redirect(`/systems/${id}`);
}
