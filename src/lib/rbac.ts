import type { Role } from "@prisma/client";

// Capability-based access control (pure policy — safe to import anywhere).
// Roles map to capabilities; actions check a capability rather than a role, so
// the policy lives in one place. Server-side enforcement lives in rbac-server.
export type Capability =
  | "scan:import"
  | "finding:update"
  | "poam:generate"
  | "poam:update"
  | "poam:milestone"
  | "mitigation:create"
  | "mitigation:approve"
  | "catalog:load"
  | "inventory:manage"
  | "apikey:manage"
  | "control:document"
  | "risk:accept"
  | "system:manage"
  | "comment:create";

const ALL: Capability[] = [
  "scan:import",
  "finding:update",
  "poam:generate",
  "poam:update",
  "poam:milestone",
  "mitigation:create",
  "mitigation:approve",
  "catalog:load",
  "inventory:manage",
  "apikey:manage",
  "control:document",
  "risk:accept",
  "system:manage",
  "comment:create",
];

export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  ADMIN: ALL,
  ISSM: [
    "scan:import",
    "finding:update",
    "poam:generate",
    "poam:update",
    "poam:milestone",
    "mitigation:create",
    "mitigation:approve",
    "inventory:manage",
    "control:document",
    "risk:accept",
    "system:manage",
    "comment:create",
  ],
  ISSO: [
    "scan:import",
    "finding:update",
    "poam:generate",
    "poam:update",
    "poam:milestone",
    "mitigation:create",
    "inventory:manage",
    "control:document",
    "comment:create",
  ],
  ANALYST: [
    "scan:import",
    "finding:update",
    "poam:generate",
    "poam:update",
    "poam:milestone",
    "mitigation:create",
    "inventory:manage",
    "control:document",
    "comment:create",
  ],
  // Engineers remediate and maintain inventory.
  ENGINEER: ["finding:update", "poam:milestone", "inventory:manage", "comment:create"],
  // Auditors observe and may annotate, but cannot change compliance state.
  AUDITOR: ["comment:create"],
};

export function can(role: Role, cap: Capability): boolean {
  return ROLE_CAPABILITIES[role]?.includes(cap) ?? false;
}

export class ForbiddenError extends Error {
  constructor(cap: Capability) {
    super(`Your role is not permitted to perform this action (${cap}).`);
    this.name = "ForbiddenError";
  }
}
