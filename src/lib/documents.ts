// Document library: versioned files with change notes and a review workflow.
// Content is immutable per version (who/when/what-changed always preserved);
// review state lives on the document with a full event timeline.

import { prisma } from "./db";
import { sha256Hex } from "./evidence";
import { nextReviewDate } from "./policies";
import type { DocumentStatus, DocumentCategory } from "@prisma/client";

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024; // 25 MB per version

/** Allowed review-state transitions. */
const TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  DRAFT: ["READY_FOR_REVIEW", "ARCHIVED"],
  READY_FOR_REVIEW: ["IN_REVIEW", "DRAFT"],
  IN_REVIEW: ["APPROVED", "CHANGES_REQUESTED", "READY_FOR_REVIEW"],
  CHANGES_REQUESTED: ["READY_FOR_REVIEW", "DRAFT"],
  APPROVED: ["ARCHIVED", "DRAFT"],
  ARCHIVED: ["DRAFT"],
};

export function canTransition(from: DocumentStatus, to: DocumentStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedTransitions(from: DocumentStatus): DocumentStatus[] {
  return TRANSITIONS[from] ?? [];
}

/** Review decisions require the senior review capability; the rest are author moves. */
export function isReviewDecision(to: DocumentStatus): boolean {
  return to === "APPROVED" || to === "CHANGES_REQUESTED" || to === "IN_REVIEW";
}

export interface DocFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}

export async function createDocument(args: {
  systemId: string;
  title: string;
  category: DocumentCategory;
  changeNote: string;
  userId: string;
  file: DocFile;
  controls?: string[];
  reviewFrequencyMonths?: number | null;
}) {
  const { systemId, title, category, changeNote, userId, file } = args;
  const doc = await prisma.systemDocument.create({
    data: {
      systemId,
      title,
      category,
      controls: args.controls ?? [],
      reviewFrequencyMonths: args.reviewFrequencyMonths ?? null,
      createdById: userId,
      versions: {
        create: {
          versionNo: 1,
          filename: file.name,
          contentType: file.type || null,
          size: file.bytes.length,
          sha256: sha256Hex(file.bytes),
          data: Buffer.from(file.bytes),
          changeNote,
          uploadedById: userId,
        },
      },
      events: {
        create: { actorId: userId, toStatus: "DRAFT", note: `Created with v1: ${changeNote}` },
      },
    },
  });
  await prisma.activity.create({
    data: {
      actorId: userId,
      verb: "created",
      entity: "SystemDocument",
      entityId: doc.id,
      summary: `Added document “${title}” (v1).`,
    },
  });
  return doc;
}

/** New version: bumps versionNo; an APPROVED document drops back to DRAFT. */
export async function addDocumentVersion(args: {
  documentId: string;
  changeNote: string;
  userId: string;
  file: DocFile;
}) {
  const { documentId, changeNote, userId, file } = args;
  const doc = await prisma.systemDocument.findUniqueOrThrow({
    where: { id: documentId },
    include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
  });
  const versionNo = (doc.versions[0]?.versionNo ?? 0) + 1;

  const version = await prisma.documentVersion.create({
    data: {
      documentId,
      versionNo,
      filename: file.name,
      contentType: file.type || null,
      size: file.bytes.length,
      sha256: sha256Hex(file.bytes),
      data: Buffer.from(file.bytes),
      changeNote,
      uploadedById: userId,
    },
  });

  // New content invalidates a completed review.
  const invalidated = doc.status === "APPROVED";
  await prisma.systemDocument.update({
    where: { id: documentId },
    data: invalidated ? { status: "DRAFT" } : {},
  });
  await prisma.documentEvent.create({
    data: {
      documentId,
      actorId: userId,
      fromStatus: invalidated ? "APPROVED" : undefined,
      toStatus: invalidated ? "DRAFT" : undefined,
      note: `Uploaded v${versionNo}: ${changeNote}${invalidated ? " (approval reset — content changed)" : ""}`,
    },
  });
  await prisma.activity.create({
    data: {
      actorId: userId,
      verb: "updated",
      entity: "SystemDocument",
      entityId: documentId,
      summary: `Uploaded v${versionNo} of “${doc.title}”: ${changeNote}`,
    },
  });
  return version;
}

export async function setDocumentStatus(args: {
  documentId: string;
  to: DocumentStatus;
  userId: string;
  note?: string;
  reviewerId?: string | null;
}) {
  const { documentId, to, userId, note } = args;
  const doc = await prisma.systemDocument.findUniqueOrThrow({ where: { id: documentId } });
  if (!canTransition(doc.status, to)) {
    throw new Error(`Cannot move a ${doc.status.replace(/_/g, " ").toLowerCase()} document to ${to.replace(/_/g, " ").toLowerCase()}.`);
  }

  await prisma.systemDocument.update({
    where: { id: documentId },
    data: {
      status: to,
      // Claiming a review records the reviewer; leaving review keeps history.
      ...(to === "IN_REVIEW" ? { reviewerId: args.reviewerId ?? userId } : {}),
      // Approval starts the re-review clock (policy lifecycle).
      ...(to === "APPROVED"
        ? { nextReviewDue: nextReviewDate(new Date(), doc.reviewFrequencyMonths) }
        : {}),
    },
  });
  await prisma.documentEvent.create({
    data: { documentId, actorId: userId, fromStatus: doc.status, toStatus: to, note: note || null },
  });
  await prisma.activity.create({
    data: {
      actorId: userId,
      verb: "moved",
      entity: "SystemDocument",
      entityId: documentId,
      summary: `Moved “${doc.title}” ${doc.status.replace(/_/g, " ")} → ${to.replace(/_/g, " ")}${note ? `: ${note}` : ""}.`,
    },
  });
}

export async function addDocumentComment(args: { documentId: string; userId: string; note: string }) {
  const { documentId, userId, note } = args;
  await prisma.documentEvent.create({ data: { documentId, actorId: userId, note } });
}
