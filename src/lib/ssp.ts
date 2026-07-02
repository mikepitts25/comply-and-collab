import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { familyName, frameworkLabel } from "@/lib/data/families";

/** Gather everything needed to render a System Security Plan for a system. */
export async function gatherSsp(systemId: string) {
  const system = await prisma.system.findUnique({
    where: { id: systemId },
    include: {
      assets: {
        orderBy: { hostname: "asc" },
        include: { _count: { select: { software: true } } },
      },
      controls: {
        include: { control: true, _count: { select: { evidence: true } } },
        orderBy: { controlId: "asc" },
      },
      findings: { where: { status: "OPEN" }, select: { severity: true } },
      poams: { select: { status: true } },
      ppsm: { orderBy: [{ status: "asc" }, { port: "asc" }] },
      interconnections: { orderBy: [{ status: "asc" }, { remoteName: "asc" }] },
    },
  });
  if (!system) return null;

  const sevCount = (s: string) =>
    system.findings.filter((f) => f.severity === s).length;

  const statusCount = (s: string) =>
    system.controls.filter((c) => c.status === s).length;

  // Group control narratives by family for the implementation section.
  const byFamily = new Map<string, typeof system.controls>();
  for (const c of system.controls) {
    const fam = c.control.family;
    (byFamily.get(fam) ?? byFamily.set(fam, []).get(fam)!).push(c);
  }

  return {
    system,
    sevCount,
    statusCount,
    byFamily,
    openPoams: system.poams.filter(
      (p) => !["COMPLETED", "CLOSED"].includes(p.status)
    ).length,
    generatedAt: new Date(),
  };
}

export type SspData = NonNullable<Awaited<ReturnType<typeof gatherSsp>>>;

/** Serialize an SSP to Markdown (for download / offline archival). */
export function sspMarkdown(d: SspData): string {
  const s = d.system;
  const L: string[] = [];
  L.push(`# System Security Plan — ${s.name} (${s.acronym})`);
  L.push("");
  L.push(`_Generated ${fmtDate(d.generatedAt)} · Comply & Collab_`);
  L.push("");
  L.push("## 1. System Identification");
  L.push("");
  L.push(`| Field | Value |`);
  L.push(`| --- | --- |`);
  L.push(`| System Name | ${s.name} |`);
  L.push(`| Acronym | ${s.acronym} |`);
  L.push(`| Description | ${s.description ?? "—"} |`);
  L.push(`| Authorization Status | ${s.authorizationStatus.replace(/_/g, " ")} |`);
  L.push(`| Authorizing Official | ${s.authorizingOfficial ?? "—"} |`);
  L.push(`| ATO Date | ${fmtDate(s.atoDate)} |`);
  L.push(`| ATO Expiration | ${fmtDate(s.atoExpiration)} |`);
  L.push(`| Frameworks | ${s.frameworks.map(frameworkLabel).join(", ")} |`);
  L.push("");
  L.push("## 2. Security Categorization (FIPS 199)");
  L.push("");
  L.push(`| Objective | Impact |`);
  L.push(`| --- | --- |`);
  L.push(`| Confidentiality | ${s.confidentiality} |`);
  L.push(`| Integrity | ${s.integrity} |`);
  L.push(`| Availability | ${s.availability} |`);
  L.push(`| **Overall** | **${s.categorization}** |`);
  L.push("");
  L.push("## 3. System Environment / Asset Inventory");
  L.push("");
  L.push(`| Hostname | IP | OS | Type |`);
  L.push(`| --- | --- | --- | --- |`);
  for (const a of s.assets) {
    L.push(`| ${a.hostname} | ${a.ipAddress ?? "—"} | ${a.osName ?? "—"} | ${a.type} |`);
  }
  if (s.assets.length === 0) L.push(`| — | — | — | — |`);
  L.push("");
  L.push("## 4. Ports, Protocols, and Services (PPSM)");
  L.push("");
  L.push(`| Port | Protocol | Service | Direction | Boundary | Status |`);
  L.push(`| --- | --- | --- | --- | --- | --- |`);
  for (const p of s.ppsm) {
    L.push(
      `| ${p.port} | ${p.protocol} | ${p.service} | ${p.direction} | ${p.boundary ?? "—"} | ${p.status} |`
    );
  }
  if (s.ppsm.length === 0) L.push(`| — | — | — | — | — | — |`);
  L.push("");
  L.push("## 5. System Interconnections (CA-3)");
  L.push("");
  L.push(`| Remote System | Connection | Direction | Data / Class. | Agreement | Expires | Status |`);
  L.push(`| --- | --- | --- | --- | --- | --- | --- |`);
  for (const ic of s.interconnections) {
    L.push(
      `| ${ic.remoteName}${ic.remoteOwner ? ` (${ic.remoteOwner})` : ""} | ${ic.connectionType} | ` +
        `${ic.direction} | ${ic.dataDescription ?? "—"}${ic.classification ? ` [${ic.classification}]` : ""} | ` +
        `${ic.agreementType} ${fmtDate(ic.agreementDate)} | ${fmtDate(ic.expiresAt)} | ${ic.status.replace(/_/g, " ")} |`
    );
  }
  if (s.interconnections.length === 0) L.push(`| — | — | — | — | — | — | — |`);
  L.push("");
  L.push("## 6. Control Implementation Summary");
  L.push("");
  L.push(
    `Implemented: ${d.statusCount("IMPLEMENTED")} · ` +
      `Partial: ${d.statusCount("PARTIALLY_IMPLEMENTED")} · ` +
      `Planned: ${d.statusCount("PLANNED")} · ` +
      `Inherited: ${d.statusCount("INHERITED")} · ` +
      `Not Implemented: ${d.statusCount("NOT_IMPLEMENTED")}`
  );
  L.push("");
  for (const [fam, controls] of d.byFamily) {
    L.push(`### ${fam} — ${familyName(fam)}`);
    L.push("");
    for (const c of controls) {
      const ev = c._count.evidence;
      L.push(
        `**${c.controlId} ${c.control.title}** — _${c.status.replace(/_/g, " ")}_` +
          (ev > 0 ? ` · ${ev} evidence artifact${ev === 1 ? "" : "s"}` : "")
      );
      L.push("");
      L.push(c.narrative ?? "_No implementation narrative documented._");
      L.push("");
    }
  }
  L.push("## 7. Risk Posture");
  L.push("");
  L.push(
    `Open findings — Critical: ${d.sevCount("CRITICAL")}, High: ${d.sevCount("HIGH")}, ` +
      `Medium: ${d.sevCount("MEDIUM")}, Low: ${d.sevCount("LOW")}.`
  );
  L.push("");
  L.push(`Active POA&Ms: ${d.openPoams}.`);
  L.push("");
  return L.join("\n");
}
