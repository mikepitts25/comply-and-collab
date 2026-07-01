import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadControls, loadCciMap } from "@/lib/data/catalog";
import { ingestScan } from "@/lib/ingest";
import { generatePoams } from "@/lib/poam";

// Requires a database (DATABASE_URL). Runs in CI (postgres service) and locally
// when the env is set; skips otherwise so the pure unit suite stays DB-free.
const hasDb = !!process.env.DATABASE_URL;
const prisma = new PrismaClient();
const ACRONYM = `ITEST_${Date.now()}`;

describe.skipIf(!hasDb)("ingest -> correlation -> POA&M pipeline", () => {
  let systemId: string;
  let userId: string;

  beforeAll(async () => {
    // Ensure the catalog exists (idempotent) so correlation can resolve CCIs.
    const controls = loadControls();
    await prisma.control.createMany({
      data: controls.map((c) => ({
        id: c.id, family: c.family, title: c.title, text: c.text,
        baselineLow: c.baselines.includes("L"),
        baselineModerate: c.baselines.includes("M"),
        baselineHigh: c.baselines.includes("H"),
      })),
      skipDuplicates: true,
    });
    const valid = new Set(controls.map((c) => c.id));
    const cci = loadCciMap();
    await prisma.cci.createMany({
      data: Object.entries(cci).map(([id, e]) => ({
        id, definition: e.definition,
        controlId: e.control && valid.has(e.control) ? e.control : null,
      })),
      skipDuplicates: true,
    });

    const user = await prisma.user.create({
      data: { email: `${ACRONYM}@test.mil`, name: "IT User", role: "ANALYST", passwordHash: "x" },
    });
    userId = user.id;
    const system = await prisma.system.create({
      data: { name: "Integration Test System", acronym: ACRONYM, categorization: "HIGH" },
    });
    systemId = system.id;
  });

  afterAll(async () => {
    if (systemId) await prisma.system.delete({ where: { id: systemId } }).catch(() => {});
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("ingests SCAP and correlates to enhancement-level controls via the DISA CCI list", async () => {
    const content = readFileSync(join(process.cwd(), "samples", "scap-rhel8-web01-xccdf.xml"), "utf8");
    const res = await ingestScan({ systemId, userId, filename: "scap.xml", content });

    expect(res.scanType).toBe("SCAP");
    expect(res.totalFindings).toBe(3);
    expect(res.openFindings).toBe(2);

    // SV-230244 (SSH KEX, CCI-001453) should map to AC-17(2).
    const sshFinding = await prisma.finding.findFirst({
      where: { systemId, ruleId: { contains: "SV-230244" } },
      include: { controls: true },
    });
    expect(sshFinding?.controls.map((c) => c.controlId)).toContain("AC-17(2)");
  });

  it("de-duplicates findings and auto-closes on rescan", async () => {
    const content = readFileSync(join(process.cwd(), "samples", "scap-rhel8-web01-xccdf.xml"), "utf8");
    // Re-import the same file with the SSH failure removed -> that finding closes.
    const trimmed = content.replace(/<xccdf:rule-result idref="[^"]*SV-230244[\s\S]*?<\/xccdf:rule-result>/, "");
    const res = await ingestScan({ systemId, userId, filename: "scap.xml", content: trimmed });
    expect(res.newFindings).toBe(0); // de-dup: nothing new
    expect(res.closedFindings).toBeGreaterThanOrEqual(1);

    const ssh = await prisma.finding.findFirst({ where: { systemId, ruleId: { contains: "SV-230244" } } });
    expect(ssh?.status).toBe("CLOSED");
    expect(ssh?.resolvedByRescan).toBe(true);
  });

  it("generates POA&Ms from remaining open findings", async () => {
    const gen = await generatePoams(systemId, userId);
    const poams = await prisma.poam.count({ where: { systemId } });
    expect(gen.created).toBeGreaterThan(0);
    expect(poams).toBe(gen.created);
  });
});
