import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createDocument, addDocumentVersion, setDocumentStatus } from "@/lib/documents";

const hasDb = !!process.env.DATABASE_URL;
const prisma = new PrismaClient();
const TAG = `DOCTEST_${Date.now()}`;

describe.skipIf(!hasDb)("document lifecycle: versions + review flow", () => {
  let systemId: string;
  let authorId: string;
  let reviewerId: string;

  beforeAll(async () => {
    const author = await prisma.user.create({
      data: { email: `${TAG}_a@t.mil`, name: "Doc Author", passwordHash: "x", role: "ANALYST" },
    });
    const reviewer = await prisma.user.create({
      data: { email: `${TAG}_r@t.mil`, name: "Doc Reviewer", passwordHash: "x", role: "ISSM" },
    });
    const system = await prisma.system.create({ data: { name: `${TAG}`, acronym: TAG } });
    systemId = system.id;
    authorId = author.id;
    reviewerId = reviewer.id;
  });

  afterAll(async () => {
    await prisma.system.deleteMany({ where: { acronym: TAG } });
    await prisma.user.deleteMany({ where: { email: { startsWith: TAG } } });
    await prisma.$disconnect();
  });

  it("tracks versions with change notes and walks the review flow", async () => {
    const file = (name: string, text: string) => ({
      name, type: "text/plain", bytes: new TextEncoder().encode(text),
    });

    const doc = await createDocument({
      systemId, title: "Incident Response Plan", category: "PLAN",
      changeNote: "Imported FY26 draft from shared drive",
      userId: authorId, file: file("irp.txt", "v1 body"),
    });
    expect(doc.status).toBe("DRAFT");

    // v2 with a change note; hashes differ per content
    await addDocumentVersion({
      documentId: doc.id, changeNote: "Added ransomware playbook section",
      userId: authorId, file: file("irp.txt", "v2 body"),
    });
    const versions = await prisma.documentVersion.findMany({
      where: { documentId: doc.id }, orderBy: { versionNo: "asc" },
    });
    expect(versions.map((v) => v.versionNo)).toEqual([1, 2]);
    expect(versions[0].sha256).not.toBe(versions[1].sha256);
    expect(versions[1].changeNote).toMatch(/ransomware/);

    // Review flow: ready -> in review (reviewer recorded) -> approved
    await setDocumentStatus({ documentId: doc.id, to: "READY_FOR_REVIEW", userId: authorId });
    await setDocumentStatus({ documentId: doc.id, to: "IN_REVIEW", userId: reviewerId });
    await setDocumentStatus({ documentId: doc.id, to: "APPROVED", userId: reviewerId, note: "Looks complete." });
    let fresh = await prisma.systemDocument.findUniqueOrThrow({ where: { id: doc.id } });
    expect(fresh.status).toBe("APPROVED");
    expect(fresh.reviewerId).toBe(reviewerId);

    // Illegal jump rejected
    await expect(
      setDocumentStatus({ documentId: doc.id, to: "IN_REVIEW", userId: reviewerId })
    ).rejects.toThrow(/cannot move/i);

    // New content resets approval to draft
    await addDocumentVersion({
      documentId: doc.id, changeNote: "Updated contact roster",
      userId: authorId, file: file("irp.txt", "v3 body"),
    });
    fresh = await prisma.systemDocument.findUniqueOrThrow({ where: { id: doc.id } });
    expect(fresh.status).toBe("DRAFT");

    // Timeline captured everything
    const events = await prisma.documentEvent.count({ where: { documentId: doc.id } });
    expect(events).toBeGreaterThanOrEqual(5);
  });
});
