// Derive a CMMC 2.0 / NIST 800-171 assessment from a system's existing 800-53
// control implementation (SystemControl records). No separate data entry: a
// requirement's status is rolled up from the statuses of its mapped controls.

import { prisma } from "./db";
import {
  CMMC_REQUIREMENTS,
  CMMC_FAMILIES,
  familyKeyOf,
  type Cmmc171Requirement,
} from "./data/cmmc-800-171";
import type { ControlStatus } from "@prisma/client";

export type RequirementStatus = "MET" | "PARTIAL" | "PLANNED" | "NOT_MET" | "NOT_APPLICABLE";

export interface AssessedRequirement extends Cmmc171Requirement {
  status: RequirementStatus;
  family: string;
  familyName: string;
  // Per mapped control: whether it is documented in this system and its status.
  controlStatuses: { controlId: string; status: ControlStatus | "UNDOCUMENTED" }[];
}

export interface FamilyRollup {
  key: string;
  name: string;
  total: number;
  met: number;
  requirements: AssessedRequirement[];
}

export interface CmmcAssessment {
  level1: { met: number; total: number };
  level2: { met: number; total: number };
  byStatus: Record<RequirementStatus, number>;
  families: FamilyRollup[];
}

const MET: ControlStatus[] = ["IMPLEMENTED", "INHERITED"];

/** Roll up a requirement's mapped-control statuses into one requirement status. */
export function deriveStatus(statuses: (ControlStatus | "UNDOCUMENTED")[]): RequirementStatus {
  if (statuses.length === 0) return "NOT_MET";
  const real = statuses.filter((s) => s !== "UNDOCUMENTED") as ControlStatus[];
  // All applicable controls fully met -> requirement met.
  if (real.length === statuses.length && real.every((s) => MET.includes(s))) return "MET";
  if (real.length > 0 && real.every((s) => s === "NOT_APPLICABLE")) return "NOT_APPLICABLE";
  // Any progress at all -> partial; only planning -> planned; nothing -> not met.
  const anyMet = real.some((s) => MET.includes(s) || s === "PARTIALLY_IMPLEMENTED");
  if (anyMet) return "PARTIAL";
  if (real.some((s) => s === "PLANNED")) return "PLANNED";
  return "NOT_MET";
}

export async function assessCmmc(systemId: string): Promise<CmmcAssessment> {
  const rows = await prisma.systemControl.findMany({
    where: { systemId },
    select: { controlId: true, status: true },
  });
  const statusByControl = new Map(rows.map((r) => [r.controlId, r.status]));

  const assessed: AssessedRequirement[] = CMMC_REQUIREMENTS.map((req) => {
    const controlStatuses = req.controls.map((controlId) => ({
      controlId,
      status: statusByControl.get(controlId) ?? ("UNDOCUMENTED" as const),
    }));
    const fam = familyKeyOf(req.id);
    return {
      ...req,
      family: fam,
      familyName: CMMC_FAMILIES[fam] ?? fam,
      controlStatuses,
      status: deriveStatus(controlStatuses.map((c) => c.status)),
    };
  });

  const byStatus: Record<RequirementStatus, number> = {
    MET: 0,
    PARTIAL: 0,
    PLANNED: 0,
    NOT_MET: 0,
    NOT_APPLICABLE: 0,
  };
  for (const r of assessed) byStatus[r.status]++;

  const isMet = (r: AssessedRequirement) => r.status === "MET" || r.status === "NOT_APPLICABLE";

  const level1Reqs = assessed.filter((r) => r.level === 1);
  const level1 = { met: level1Reqs.filter(isMet).length, total: level1Reqs.length };
  const level2 = { met: assessed.filter(isMet).length, total: assessed.length };

  // Group into families in canonical order.
  const families: FamilyRollup[] = Object.entries(CMMC_FAMILIES).map(([key, name]) => {
    const reqs = assessed.filter((r) => r.family === key);
    return { key, name, total: reqs.length, met: reqs.filter(isMet).length, requirements: reqs };
  });

  return { level1, level2, byStatus, families };
}
