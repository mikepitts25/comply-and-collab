import { prisma } from "./db";
import type { Severity } from "@prisma/client";

/** Days until scheduled completion, by severity (DoD POA&M conventions). */
const REMEDIATION_DAYS: Record<Severity, number> = {
  CRITICAL: 15,
  HIGH: 30,
  MEDIUM: 90,
  LOW: 180,
  INFO: 365,
};

const RISK_BY_SEVERITY: Record<Severity, "LOW" | "MODERATE" | "HIGH"> = {
  CRITICAL: "HIGH",
  HIGH: "HIGH",
  MEDIUM: "MODERATE",
  LOW: "LOW",
  INFO: "LOW",
};

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export interface GenerateResult {
  created: number;
  linked: number;
}

/**
 * Auto-generate POA&M items from a system's OPEN findings that aren't already
 * tied to a POA&M. Findings are grouped by (rule, severity) so identical
 * weaknesses across hosts roll up into one POA&M.
 */
export async function generatePoams(
  systemId: string,
  userId?: string
): Promise<GenerateResult> {
  const openFindings = await prisma.finding.findMany({
    where: { systemId, status: "OPEN", poamId: null },
    include: { controls: true },
  });

  if (openFindings.length === 0) return { created: 0, linked: 0 };

  // Group identical weaknesses across assets by rule id.
  const groups = new Map<string, typeof openFindings>();
  for (const f of openFindings) {
    const key = f.ruleId;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(f);
  }

  // Continue POA&M numbering from the current max for this system.
  const last = await prisma.poam.findFirst({
    where: { systemId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  let nextNumber = (last?.number ?? 0) + 1;

  let created = 0;
  let linked = 0;
  const now = new Date();

  for (const [, findings] of groups) {
    const lead = findings[0];
    const controlIds = [
      ...new Set(findings.flatMap((f) => f.controls.map((c) => c.controlId))),
    ];
    const hostCount = new Set(findings.map((f) => f.assetId)).size;

    const poam = await prisma.poam.create({
      data: {
        systemId,
        number: nextNumber++,
        weakness:
          `${lead.title}` +
          (hostCount > 1 ? ` (affects ${hostCount} assets)` : ""),
        sourceIdentifier:
          lead.source === "ACAS"
            ? `ACAS Plugin ${lead.pluginId ?? lead.ruleId}`
            : `STIG ${lead.stigId ?? lead.ruleId}`,
        severity: lead.severity,
        riskRating: RISK_BY_SEVERITY[lead.severity],
        recommendation: lead.fixText ?? undefined,
        detectionDate: lead.firstSeen,
        scheduledCompletion: addDays(now, REMEDIATION_DAYS[lead.severity]),
        ownerId: userId,
        findings: { connect: findings.map((f) => ({ id: f.id })) },
        controls: { create: controlIds.map((controlId) => ({ controlId })) },
        milestones: {
          create: [
            { description: "Validate finding and assess impact" },
            {
              description: "Implement remediation or document mitigation",
              dueDate: addDays(now, Math.floor(REMEDIATION_DAYS[lead.severity] / 2)),
            },
            {
              description: "Verify closure via rescan",
              dueDate: addDays(now, REMEDIATION_DAYS[lead.severity]),
            },
          ],
        },
      },
    });

    created++;
    linked += findings.length;
  }

  if (userId) {
    await prisma.activity.create({
      data: {
        actorId: userId,
        verb: "generated",
        entity: "Poam",
        entityId: systemId,
        summary: `Generated ${created} POA&M item(s) from ${linked} open finding(s).`,
      },
    });
  }

  return { created, linked };
}
