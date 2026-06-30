import { randomBytes, createHash } from "node:crypto";
import { prisma } from "./db";
import type { Role } from "@prisma/client";

const PREFIX = "cc";

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Mint a new API key. The plaintext is returned once and never stored. */
export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString("base64url");
  const id = randomBytes(4).toString("hex"); // 8-char public identifier
  const plaintext = `${PREFIX}_${id}_${secret}`;
  return { plaintext, prefix: `${PREFIX}_${id}`, hash: hashKey(plaintext) };
}

export interface ApiActor {
  userId: string;
  role: Role;
  name: string;
  keyId: string;
}

/**
 * Resolve an API key (from Authorization: Bearer / X-API-Key) to its owning
 * user. Returns null for missing/invalid/revoked keys. Touches lastUsedAt.
 */
export async function authenticateApiKey(
  raw: string | null
): Promise<ApiActor | null> {
  if (!raw) return null;
  const key = raw.replace(/^Bearer\s+/i, "").trim();
  if (!key) return null;

  const record = await prisma.apiKey.findUnique({
    where: { hash: hashKey(key) },
    include: { user: true },
  });
  if (!record || record.revokedAt || !record.user.active) return null;

  await prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    userId: record.userId,
    role: record.user.role,
    name: record.user.name,
    keyId: record.id,
  };
}
