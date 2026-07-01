import { readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { loadControls, loadCciMap } from "../src/lib/data/catalog";
import { ingestScan } from "../src/lib/ingest";
import { generatePoams } from "../src/lib/poam";

const prisma = new PrismaClient();
const SAMPLES = join(process.cwd(), "samples");

async function main() {
  console.log("Seeding Comply & Collab...");

  // --- Wipe (idempotent dev seed) ---
  await prisma.$transaction([
    prisma.comment.deleteMany(),
    prisma.milestone.deleteMany(),
    prisma.findingControl.deleteMany(),
    prisma.poamControl.deleteMany(),
    prisma.mitigationControl.deleteMany(),
    prisma.finding.deleteMany(),
    prisma.poam.deleteMany(),
    prisma.postureSnapshot.deleteMany(),
    prisma.scanImport.deleteMany(),
    prisma.asset.deleteMany(),
    prisma.systemControl.deleteMany(),
    prisma.mitigationStatement.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.system.deleteMany(),
    prisma.cci.deleteMany(),
    prisma.control.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // --- Control catalog (full NIST 800-53 Rev 5) ---
  const controls = loadControls();
  const validControlIds = new Set(controls.map((c) => c.id));
  await prisma.control.createMany({
    data: controls.map((c) => ({
      id: c.id,
      family: c.family,
      title: c.title,
      text: c.text,
      baselineLow: c.baselines.includes("L"),
      baselineModerate: c.baselines.includes("M"),
      baselineHigh: c.baselines.includes("H"),
    })),
    skipDuplicates: true,
  });

  // --- CCIs (full DISA list, mapped to controls where available) ---
  const cciMap = loadCciMap();
  const cciRows = Object.entries(cciMap).map(([id, e]) => ({
    id,
    definition: e.definition,
    controlId: e.control && validControlIds.has(e.control) ? e.control : null,
  }));
  await prisma.cci.createMany({ data: cciRows, skipDuplicates: true });
  const mappedCcis = cciRows.filter((c) => c.controlId).length;
  console.log(
    `  Catalog: ${controls.length} controls, ${cciRows.length} CCIs (${mappedCcis} mapped)`
  );

  // --- Users ---
  const pw = await bcrypt.hash("Password123!", 10);
  const [admin, issm, analyst, engineer] = await Promise.all([
    prisma.user.create({ data: { email: "admin@demo.mil", name: "Avery Admin", role: "ADMIN", passwordHash: pw, edipi: "1000000001" } }),
    prisma.user.create({ data: { email: "issm@demo.mil", name: "Morgan ISSM", role: "ISSM", passwordHash: pw, edipi: "1000000002" } }),
    prisma.user.create({ data: { email: "analyst@demo.mil", name: "Riley Analyst", role: "ANALYST", passwordHash: pw, edipi: "1234567890" } }),
    prisma.user.create({ data: { email: "engineer@demo.mil", name: "Jordan Engineer", role: "ENGINEER", passwordHash: pw, edipi: "1000000004" } }),
    prisma.user.create({ data: { email: "auditor@demo.mil", name: "Casey Auditor", role: "AUDITOR", passwordHash: pw, edipi: "1000000005" } }),
  ]);
  console.log("  Users: admin / issm / analyst / engineer / auditor @demo.mil (pw: Password123!)");

  // --- System ---
  // A 3-year ATO nearing reauthorization (expires ~70 days out) so the
  // expiration warnings and the dashboard attention panel are meaningful.
  const atoExpiration = new Date();
  atoExpiration.setDate(atoExpiration.getDate() + 70);
  const atoDate = new Date(atoExpiration);
  atoDate.setFullYear(atoDate.getFullYear() - 3);

  const system = await prisma.system.create({
    data: {
      name: "Mission Data Platform",
      acronym: "MDP",
      description:
        "Web application and database platform processing mission planning data. Hosted in an on-prem IL5 enclave.",
      confidentiality: "HIGH",
      integrity: "MODERATE",
      availability: "MODERATE",
      categorization: "HIGH",
      frameworks: ["RMF_800_53", "STIG"],
      authorizationStatus: "ATO",
      atoDate,
      atoExpiration,
      authorizingOfficial: "Col. P. Stone (AO)",
    },
  });
  console.log(`  System: ${system.name} (${system.acronym})`);

  // --- Ingest the sample scans through the real pipeline ---
  const files: Array<{ name: string }> = [
    { name: "acas-scan.nessus" },
    { name: "rhel8-web01.ckl" },
    { name: "windows-app01.cklb" },
    { name: "scap-rhel8-web01-xccdf.xml" },
  ];
  for (const f of files) {
    const content = readFileSync(join(SAMPLES, f.name), "utf8");
    const res = await ingestScan({
      systemId: system.id,
      userId: analyst.id,
      filename: f.name,
      content,
    });
    console.log(
      `  Imported ${f.name}: ${res.totalFindings} findings (${res.openFindings} open) across ${res.assets} asset(s)`
    );
  }

  // --- Auto-generate POA&Ms from open findings ---
  const gen = await generatePoams(system.id, analyst.id);
  console.log(`  Generated ${gen.created} POA&M(s) from ${gen.linked} open finding(s)`);

  // Assign a couple of POA&Ms to the engineer and set one ongoing.
  const poams = await prisma.poam.findMany({ where: { systemId: system.id }, orderBy: { number: "asc" } });
  if (poams[0]) await prisma.poam.update({ where: { id: poams[0].id }, data: { ownerId: engineer.id, status: "ONGOING" } });
  if (poams[1]) await prisma.poam.update({ where: { id: poams[1].id }, data: { ownerId: engineer.id } });

  // Assign the highest-severity open findings to the engineer.
  const criticalFindings = await prisma.finding.findMany({
    where: { systemId: system.id, status: "OPEN", severity: { in: ["CRITICAL", "HIGH"] } },
  });
  for (const f of criticalFindings) {
    await prisma.finding.update({ where: { id: f.id }, data: { assigneeId: engineer.id } });
  }

  // --- Mitigation statement library ---
  await prisma.mitigationStatement.create({
    data: {
      title: "DoD Consent Banner — compensating control",
      body: "Where the login banner cannot be displayed at the application layer, the enclave boundary device presents the Standard Mandatory DoD Notice and Consent Banner. Physical access is restricted to cleared personnel within a controlled facility, and all sessions are logged.",
      tags: ["banner", "AC-8", "consent"],
      approved: true,
      authorId: issm.id,
      controlLinks: { create: [{ controlId: "AC-8" }] },
    },
  });
  await prisma.mitigationStatement.create({
    data: {
      title: "Weak password hashing — interim mitigation",
      body: "Pending migration to SHA-512, the affected hosts enforce 15-character minimum passwords, account lockout after 3 attempts, and are accessible only via bastion with MFA. Offline credential exposure risk is reduced by full-disk encryption.",
      tags: ["IA-5", "password", "crypto"],
      approved: false,
      authorId: analyst.id,
      controlLinks: { create: [{ controlId: "IA-5" }] },
    },
  });
  console.log("  Mitigation library: 2 statements");

  // --- A few SSP control implementation narratives ---
  const sysControlData = [
    { controlId: "AC-7", status: "PARTIALLY_IMPLEMENTED" as const, narrative: "Account lockout enforced on Windows via GPO; RHEL pam_faillock remediation in progress (see POA&M)." },
    { controlId: "SI-2", status: "IMPLEMENTED" as const, narrative: "Patch management via Red Hat Satellite and WSUS; ACAS scans weekly; critical patches within 15 days." },
    { controlId: "CM-6", status: "PARTIALLY_IMPLEMENTED" as const, narrative: "STIGs applied via Ansible baseline; open findings tracked in POA&Ms." },
    { controlId: "SC-28", status: "PLANNED" as const, narrative: "BitLocker rollout planned for all data volumes this quarter." },
  ];
  for (const sc of sysControlData) {
    await prisma.systemControl.create({ data: { systemId: system.id, ...sc } });
  }
  console.log("  SSP: 4 control narratives");

  // --- Hardware / software inventory + PPSM ---
  const assets = await prisma.asset.findMany({ where: { systemId: system.id } });
  const hw: Record<string, { manufacturer: string; model: string; location: string; virtual: boolean }> = {
    web: { manufacturer: "Dell", model: "PowerEdge R760", location: "Bldg 5 / Rack A12", virtual: true },
    db: { manufacturer: "Dell", model: "PowerEdge R760", location: "Bldg 5 / Rack A13", virtual: false },
    app: { manufacturer: "HPE", model: "ProLiant DL380", location: "Bldg 5 / Rack A14", virtual: true },
  };
  for (const a of assets) {
    const key = a.hostname.startsWith("db") ? "db" : a.hostname.startsWith("app") ? "app" : "web";
    const d = hw[key];
    await prisma.asset.update({
      where: { id: a.id },
      data: {
        manufacturer: d.manufacturer,
        model: d.model,
        location: d.location,
        virtual: d.virtual,
        serialNumber: `SN-${a.hostname.replace(/\W/g, "").toUpperCase().slice(0, 6)}${Math.floor(1000 + Math.random() * 9000)}`,
      },
    });
  }
  // Software for the primary web/db/app hosts
  const swByHost: Record<string, Array<{ name: string; version: string; vendor: string; type: any }>> = {
    web: [
      { name: "Red Hat Enterprise Linux", version: "8.8", vendor: "Red Hat", type: "OPERATING_SYSTEM" },
      { name: "Apache HTTP Server", version: "2.4.37", vendor: "Apache", type: "APPLICATION" },
      { name: "OpenSSL", version: "1.1.1k", vendor: "OpenSSL", type: "MIDDLEWARE" },
    ],
    db: [
      { name: "Red Hat Enterprise Linux", version: "8.8", vendor: "Red Hat", type: "OPERATING_SYSTEM" },
      { name: "PostgreSQL", version: "13.11", vendor: "PostgreSQL", type: "DATABASE" },
    ],
    app: [
      { name: "Windows Server", version: "2022", vendor: "Microsoft", type: "OPERATING_SYSTEM" },
      { name: "Microsoft IIS", version: "10.0", vendor: "Microsoft", type: "APPLICATION" },
      { name: ".NET Runtime", version: "8.0", vendor: "Microsoft", type: "MIDDLEWARE" },
    ],
  };
  let swCount = 0;
  for (const a of assets) {
    const key = a.hostname.startsWith("db") ? "db" : a.hostname.startsWith("app") ? "app" : "web";
    // Only populate the canonical hosts to avoid duplicates across name variants
    if (!["web01.demo.mil", "db01.demo.mil", "app01"].includes(a.hostname)) continue;
    for (const s of swByHost[key]) {
      await prisma.softwareComponent.create({ data: { assetId: a.id, ...s } });
      swCount++;
    }
  }
  // PPSM entries for the system boundary
  const ppsm = [
    { port: "443", protocol: "TCP" as const, service: "HTTPS (web app)", direction: "INBOUND" as const, boundary: "Enclave / IL5 boundary", classification: "CUI", status: "APPROVED" as const, justification: "Mission user access to the web application over TLS 1.2+." },
    { port: "22", protocol: "TCP" as const, service: "SSH (admin via bastion)", direction: "INBOUND" as const, boundary: "Management VLAN", classification: "CUI", status: "APPROVED" as const, justification: "Administrative access restricted to bastion host with MFA." },
    { port: "5432", protocol: "TCP" as const, service: "PostgreSQL", direction: "INBOUND" as const, boundary: "Internal app↔db", classification: "CUI", status: "APPROVED" as const, justification: "Application-to-database traffic within the boundary." },
    { port: "514", protocol: "UDP" as const, service: "Syslog to SIEM", direction: "OUTBOUND" as const, boundary: "Enclave / IL5 boundary", classification: "CUI", status: "PENDING" as const, justification: "Forward audit logs to enterprise SIEM; awaiting CCB approval." },
  ];
  for (const p of ppsm) await prisma.ppsmEntry.create({ data: { systemId: system.id, ...p } });
  console.log(`  Inventory: HW on ${assets.length} assets, ${swCount} software, ${ppsm.length} PPSM entries`);

  // --- Synthesize a backdated ConMon posture trend ---
  // The live imports above each produced a snapshot at "now"; add weekly
  // history declining toward the current posture so the trend chart is useful.
  const curBySev = await prisma.finding.groupBy({
    by: ["severity"],
    where: { systemId: system.id, status: "OPEN" },
    _count: true,
  });
  const cur = (s: string) => curBySev.find((g) => g.severity === s)?._count ?? 0;
  const target = {
    c: cur("CRITICAL"),
    h: cur("HIGH"),
    m: cur("MEDIUM"),
    l: cur("LOW"),
  };
  const weeks = 9;
  for (let w = weeks; w >= 1; w--) {
    const factor = 1 + w / 3; // older = more open findings
    const takenAt = new Date();
    takenAt.setDate(takenAt.getDate() - w * 7);
    const openCritical = Math.round(target.c * factor);
    const openHigh = Math.round(target.h * factor);
    const openMedium = Math.round(target.m * factor);
    const openLow = Math.round(target.l * factor);
    const totalOpen = openCritical + openHigh + openMedium + openLow;
    await prisma.postureSnapshot.create({
      data: {
        systemId: system.id,
        takenAt,
        openCritical,
        openHigh,
        openMedium,
        openLow,
        totalOpen,
        closedTotal: Math.round((weeks - w) * 1.5),
      },
    });
  }
  console.log(`  ConMon: ${weeks} weeks of posture history`);

  // ==========================================================================
  // Second system (MODERATE baseline, ATO with conditions) to exercise the
  // cross-system dashboard, ConMon, and coverage at a different baseline.
  // ==========================================================================
  const lssExpiration = new Date();
  lssExpiration.setMonth(lssExpiration.getMonth() + 14);
  const lssAtoDate = new Date(lssExpiration);
  lssAtoDate.setFullYear(lssAtoDate.getFullYear() - 3);

  const lss = await prisma.system.create({
    data: {
      name: "Logistics Support System",
      acronym: "LSS",
      description: "Supply and logistics tracking system. Hosted in an on-prem IL4 enclave.",
      confidentiality: "MODERATE",
      integrity: "MODERATE",
      availability: "LOW",
      categorization: "MODERATE",
      frameworks: ["RMF_800_53", "STIG", "CMMC"],
      authorizationStatus: "ATO_WITH_CONDITIONS",
      atoDate: lssAtoDate,
      atoExpiration: lssExpiration,
      authorizingOfficial: "Ms. D. Rivera (AO)",
    },
  });
  for (const name of ["acas-scan.nessus", "windows-app01.cklb"]) {
    const content = readFileSync(join(SAMPLES, name), "utf8");
    await ingestScan({ systemId: lss.id, userId: issm.id, filename: name, content });
  }
  const lssGen = await generatePoams(lss.id, issm.id);
  await prisma.systemControl.create({
    data: { systemId: lss.id, controlId: "AC-2", status: "IMPLEMENTED", narrative: "Accounts managed via centralized IdAM with quarterly reviews." },
  });
  await prisma.ppsmEntry.create({
    data: { systemId: lss.id, port: "443", protocol: "TCP", service: "HTTPS", direction: "INBOUND", boundary: "Enclave / IL4 boundary", classification: "CUI", status: "APPROVED", justification: "User access to the logistics web UI." },
  });
  // A short posture history for LSS.
  const lssOpen = await prisma.finding.groupBy({ by: ["severity"], where: { systemId: lss.id, status: "OPEN" }, _count: true });
  const lc = (s: string) => lssOpen.find((g) => g.severity === s)?._count ?? 0;
  for (let w = 6; w >= 1; w--) {
    const takenAt = new Date();
    takenAt.setDate(takenAt.getDate() - w * 7);
    const f = 1 + w / 4;
    const oc = Math.round(lc("CRITICAL") * f), oh = Math.round(lc("HIGH") * f), om = Math.round(lc("MEDIUM") * f), ol = Math.round(lc("LOW") * f);
    await prisma.postureSnapshot.create({
      data: { systemId: lss.id, takenAt, openCritical: oc, openHigh: oh, openMedium: om, openLow: ol, totalOpen: oc + oh + om + ol, closedTotal: (6 - w) },
    });
  }
  console.log(`  System 2: ${lss.name} (${lss.acronym}) — ${lssGen.created} POA&Ms, MODERATE baseline`);

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
