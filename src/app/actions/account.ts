"use server";

import { prisma } from "@/lib/db";
import { requireUser, verifyPassword, hashPassword } from "@/lib/auth";

export type PasswordState = { error?: string; ok?: boolean };

/** Change the signed-in user's own password (verifies the current one). */
export async function changeOwnPasswordAction(
  _prev: PasswordState | undefined,
  fd: FormData
): Promise<PasswordState> {
  const session = await requireUser();
  const current = String(fd.get("current") || "");
  const next = String(fd.get("next") || "");
  const confirm = String(fd.get("confirm") || "");

  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New password and confirmation do not match." };

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return { error: "Account not found." };
  if (!(await verifyPassword(current, user.passwordHash))) {
    return { error: "Current password is incorrect." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next) },
  });
  return { ok: true };
}
