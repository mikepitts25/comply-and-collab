// Control evidence artifacts: proof backing a control implementation
// (config excerpts, screenshots, policy docs). Bytes are stored in Postgres
// so the whole ATO package lives in one backup (air-gap friendly).

import { createHash } from "node:crypto";
import { prisma } from "./db";

export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024; // 10 MB per artifact

export function sha256Hex(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Validate an upload; returns an error string or null when acceptable. */
export function validateEvidenceFile(size: number, filename: string | null): string | null {
  if (size > MAX_EVIDENCE_BYTES) {
    return `File exceeds the ${Math.floor(MAX_EVIDENCE_BYTES / 1024 / 1024)} MB evidence limit.`;
  }
  if (filename && /[/\\]/.test(filename)) return "Invalid filename.";
  return null;
}

export async function addEvidence(args: {
  systemControlId: string;
  description: string;
  userId: string;
  file?: { name: string; type: string; bytes: Uint8Array } | null;
}) {
  const { systemControlId, description, userId, file } = args;

  const evidence = await prisma.evidence.create({
    data: {
      systemControlId,
      description,
      uploadedById: userId,
      filename: file?.name ?? null,
      contentType: file?.type || null,
      size: file?.bytes.length ?? 0,
      sha256: file ? sha256Hex(file.bytes) : null,
      data: file ? Buffer.from(file.bytes) : null,
    },
    include: { systemControl: { select: { systemId: true, controlId: true } } },
  });

  await prisma.activity.create({
    data: {
      actorId: userId,
      verb: "attached",
      entity: "Evidence",
      entityId: evidence.id,
      summary: `Attached evidence to ${evidence.systemControl.controlId}${file ? ` (${file.name})` : ""}.`,
    },
  });
  return evidence;
}
