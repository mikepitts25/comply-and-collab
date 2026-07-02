import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { requestDeviation, decideDeviation } from "@/lib/deviations";

// Requires a database (DATABASE_URL); skips otherwise like the pipeline test.
const hasDb = !!process.env.DATABASE_URL;
const prisma = new PrismaClient();
const TAG = `DEVTEST_${Date.now()}`;

describe.skipIf(!hasDb)("deviation request -> decision workflow", () => {
  let findingId: string;
  let analystId: string;
  let issmId: string;
  let systemId: string;

  beforeAll(async () => {
    const analyst = await prisma.user.create({
      data: { email: `${TAG}_a@t.mil`, name: "Dev Analyst", passwordHash: "x", role: "ANALYST" },
    });
    const issm = await prisma.user.create({
      data: { email: `${TAG}_i@t.mil`, name: "Dev ISSM", passwordHash: "x", role: "ISSM" },
    });
    const system = await prisma.system.create({
      data: { name: `${TAG} System`, acronym: TAG },
    });
    const finding = await prisma.finding.create({
      data: {
        source: "ACAS",
        systemId: system.id,
        ruleId: `${TAG}-plugin`,
        title: "Test finding",
        severity: "MEDIUM",
        status: "OPEN",
      },
    });
    analystId = analyst.id;
    issmId = issm.id;
    systemId = system.id;
    findingId = finding.id;
  });

  afterAll(async () => {
    await prisma.system.deleteMany({ where: { acronym: TAG } });
    await prisma.user.deleteMany({ where: { email: { startsWith: TAG } } });
    await prisma.$disconnect();
  });

  it("blocks a second request while one is pending, then approval retires the finding", async () => {
    const dev = await requestDeviation({
      findingId,
      type: "FALSE_POSITIVE",
      justification: "Plugin misidentifies the backported patch.",
      evidence: "rpm -q kernel => patched build",
      userId: analystId,
    });
    expect(dev.status).toBe("PENDING");

    await expect(
      requestDeviation({
        findingId,
        type: "OPERATIONAL_REQUIREMENT",
        justification: "dup",
        userId: analystId,
      })
    ).rejects.toThrow(/already pending/i);

    const decided = await decideDeviation({
      deviationId: dev.id,
      approve: true,
      userId: issmId,
      note: "Verified backport evidence.",
    });
    expect(decided.status).toBe("APPROVED");

    const finding = await prisma.finding.findUnique({ where: { id: findingId } });
    expect(finding?.status).toBe("NOT_A_FINDING");
    expect(finding?.closedAt).not.toBeNull();

    // Already-decided deviations cannot be re-decided.
    await expect(
      decideDeviation({ deviationId: dev.id, approve: false, userId: issmId })
    ).rejects.toThrow(/already been decided/i);
  });
});
