import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { importPoamSheet } from "@/lib/import/poam-import";

const hasDb = !!process.env.DATABASE_URL;
const prisma = new PrismaClient();
const TAG = `SHEETTEST_${Date.now()}`;

describe.skipIf(!hasDb)("POA&M sheet import: dry-run then apply", () => {
  let systemId: string;
  let userId: string;
  const bytes = new TextEncoder().encode(
    readFileSync(join(process.cwd(), "samples", "poam-import-sample.csv"), "utf8")
  );

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `${TAG}@t.mil`, name: "Sheet Tester", passwordHash: "x", role: "ANALYST" },
    });
    const system = await prisma.system.create({ data: { name: TAG, acronym: TAG } });
    systemId = system.id;
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.system.deleteMany({ where: { acronym: TAG } });
    await prisma.user.deleteMany({ where: { email: { startsWith: TAG } } });
    await prisma.$disconnect();
  });

  it("preview reports counts without writing; import then applies them", async () => {
    const preview = await importPoamSheet({ systemId, userId, filename: "s.csv", bytes, dryRun: true });
    expect(preview).toMatchObject({ created: 2, updated: 0, milestones: 4 });
    expect(await prisma.poam.count({ where: { systemId } })).toBe(0); // nothing written

    const applied = await importPoamSheet({ systemId, userId, filename: "s.csv", bytes });
    expect(applied).toMatchObject({ created: 2, updated: 0, milestones: 4 });
    expect(await prisma.poam.count({ where: { systemId } })).toBe(2);

    // A second preview now reports updates, still without writing.
    // (sample rows have blank ids, so they'd create again — export ids round-trip instead)
    const preview2 = await importPoamSheet({ systemId, userId, filename: "s.csv", bytes, dryRun: true });
    expect(preview2.created).toBe(2);
    expect(await prisma.poam.count({ where: { systemId } })).toBe(2);
  });
});
