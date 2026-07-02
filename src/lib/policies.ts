// Policy lifecycle: every 800-53 family requires a documented, periodically
// reviewed policy (the "-1" controls: AC-1, AU-1, ...). Health is derived from
// the document library: POLICY-category documents mapped to those controls.

import { prisma } from "./db";
import { FAMILY_NAMES } from "./data/families";
import type { DocumentStatus } from "@prisma/client";

export type PolicyState = "CURRENT" | "REVIEW_OVERDUE" | "IN_PROGRESS" | "MISSING";

export interface PolicyDocLite {
  id: string;
  title: string;
  status: DocumentStatus;
  controls: string[];
  nextReviewDue: Date | null;
}

/** Next re-review date after an approval. */
export function nextReviewDate(from: Date, months: number | null | undefined): Date | null {
  if (!months || months <= 0) return null;
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Roll one family's policy docs into a single state (pure, testable). */
export function familyPolicyState(docs: PolicyDocLite[], now = new Date()): PolicyState {
  if (docs.length === 0) return "MISSING";
  const approved = docs.filter((d) => d.status === "APPROVED");
  if (approved.some((d) => !d.nextReviewDue || d.nextReviewDue > now)) return "CURRENT";
  if (approved.length > 0) return "REVIEW_OVERDUE";
  if (docs.some((d) => ["DRAFT", "READY_FOR_REVIEW", "IN_REVIEW", "CHANGES_REQUESTED"].includes(d.status))) {
    return "IN_PROGRESS";
  }
  return "MISSING"; // archived only
}

export interface FamilyPolicyHealth {
  family: string;
  name: string;
  state: PolicyState;
  docs: PolicyDocLite[];
}

export interface SystemPolicyHealth {
  systemId: string;
  acronym: string;
  families: FamilyPolicyHealth[];
  current: number;
  total: number;
}

/** Policy health for every system: 20 families x mapped policy documents. */
export async function policyHealth(): Promise<SystemPolicyHealth[]> {
  const systems = await prisma.system.findMany({
    orderBy: { acronym: "asc" },
    select: {
      id: true,
      acronym: true,
      documents: {
        where: { category: "POLICY" },
        select: { id: true, title: true, status: true, controls: true, nextReviewDue: true },
      },
    },
  });

  const familyKeys = Object.keys(FAMILY_NAMES);
  return systems.map((s) => {
    const families: FamilyPolicyHealth[] = familyKeys.map((fam) => {
      const docs = s.documents.filter((d) => d.controls.includes(`${fam}-1`));
      return { family: fam, name: FAMILY_NAMES[fam], state: familyPolicyState(docs), docs };
    });
    return {
      systemId: s.id,
      acronym: s.acronym,
      families,
      current: families.filter((f) => f.state === "CURRENT").length,
      total: families.length,
    };
  });
}
