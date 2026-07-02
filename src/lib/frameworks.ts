// Generic framework-crosswalk assessment: derive posture against any framework
// (ISO 27001, CIS v8, …) from a system's documented 800-53 implementation.
// Same rollup semantics as the CMMC/800-171 view (deriveStatus is shared).

import { prisma } from "./db";
import { deriveStatus, type RequirementStatus } from "./cmmc";
import { ISO_27001 } from "./data/frameworks/iso-27001";
import { CIS_V8 } from "./data/frameworks/cis-v8";
import type { FrameworkDef, FrameworkRequirement } from "./data/frameworks/types";
import type { ControlStatus } from "@prisma/client";

export type { FrameworkDef, FrameworkRequirement };
export type { RequirementStatus };

export const FRAMEWORKS: Record<string, FrameworkDef> = {
  [ISO_27001.key]: ISO_27001,
  [CIS_V8.key]: CIS_V8,
};

export interface AssessedFrameworkRequirement extends FrameworkRequirement {
  status: RequirementStatus;
  controlStatuses: { controlId: string; status: ControlStatus | "UNDOCUMENTED" }[];
}

export interface FrameworkGroupRollup {
  key: string;
  name: string;
  total: number;
  met: number;
  requirements: AssessedFrameworkRequirement[];
}

export interface FrameworkAssessment {
  framework: FrameworkDef;
  met: number;
  total: number;
  byStatus: Record<RequirementStatus, number>;
  groups: FrameworkGroupRollup[];
}

export async function assessFramework(
  systemId: string,
  frameworkKey: string
): Promise<FrameworkAssessment | null> {
  const framework = FRAMEWORKS[frameworkKey];
  if (!framework) return null;

  const rows = await prisma.systemControl.findMany({
    where: { systemId },
    select: { controlId: true, status: true },
  });
  const statusByControl = new Map(rows.map((r) => [r.controlId, r.status]));

  const assessed: AssessedFrameworkRequirement[] = framework.requirements.map((req) => {
    const controlStatuses = req.controls.map((controlId) => ({
      controlId,
      status: statusByControl.get(controlId) ?? ("UNDOCUMENTED" as const),
    }));
    return {
      ...req,
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

  const isMet = (r: AssessedFrameworkRequirement) =>
    r.status === "MET" || r.status === "NOT_APPLICABLE";

  const groups: FrameworkGroupRollup[] = framework.groups.map((g) => {
    const reqs = assessed.filter((r) => r.group === g.key);
    return {
      key: g.key,
      name: g.name,
      total: reqs.length,
      met: reqs.filter(isMet).length,
      requirements: reqs,
    };
  });

  return {
    framework,
    met: assessed.filter(isMet).length,
    total: assessed.length,
    byStatus,
    groups,
  };
}
