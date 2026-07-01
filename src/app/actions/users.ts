"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/rbac-server";
import { ForbiddenError } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import type { Role } from "@prisma/client";

const ROLES: Role[] = ["ADMIN", "ISSM", "ISSO", "ANALYST", "ENGINEER", "AUDITOR"];

export type UserFormState = { error?: string; ok?: boolean };

export async function createUserAction(
  _prev: UserFormState | undefined,
  fd: FormData
): Promise<UserFormState> {
  try {
    await requireCapability("user:manage");
  } catch (e) {
    if (e instanceof ForbiddenError) return { error: e.message };
    throw e;
  }
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const name = String(fd.get("name") || "").trim();
  const password = String(fd.get("password") || "");
  const role = String(fd.get("role") || "ANALYST") as Role;
  const edipi = String(fd.get("edipi") || "").trim() || null;
  if (!email || !name || password.length < 8) {
    return { error: "Email, name, and an 8+ character password are required." };
  }
  if (!ROLES.includes(role)) return { error: "Invalid role." };

  try {
    await prisma.user.create({
      data: { email, name, role, edipi, passwordHash: await hashPassword(password) },
    });
  } catch {
    return { error: `A user with email "${email}" or that EDIPI may already exist.` };
  }
  revalidatePath("/settings/users");
  return { ok: true };
}

export async function updateUserAction(fd: FormData): Promise<void> {
  const admin = await requireCapability("user:manage");
  const id = String(fd.get("id") || "");
  if (!id) return;
  const role = String(fd.get("role") || "") as Role;
  const active = fd.get("active") === "on";
  const edipi = String(fd.get("edipi") || "").trim() || null;

  await prisma.user.update({
    where: { id },
    data: {
      ...(ROLES.includes(role) ? { role } : {}),
      // Guard against an admin locking themselves out.
      active: id === admin.id ? true : active,
      edipi,
    },
  });
  revalidatePath("/settings/users");
}

export async function resetPasswordAction(fd: FormData): Promise<void> {
  await requireCapability("user:manage");
  const id = String(fd.get("id") || "");
  const password = String(fd.get("password") || "");
  if (!id || password.length < 8) return;
  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });
  revalidatePath("/settings/users");
}
