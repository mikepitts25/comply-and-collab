import { describe, it, expect } from "vitest";
import { can, ROLE_CAPABILITIES } from "@/lib/rbac";

describe("RBAC capability matrix", () => {
  it("AUDITOR is read-only except comments", () => {
    expect(can("AUDITOR", "comment:create")).toBe(true);
    expect(can("AUDITOR", "finding:update")).toBe(false);
    expect(can("AUDITOR", "scan:import")).toBe(false);
    expect(can("AUDITOR", "poam:update")).toBe(false);
  });

  it("ENGINEER remediates but cannot import or manage POA&M metadata", () => {
    expect(can("ENGINEER", "finding:update")).toBe(true);
    expect(can("ENGINEER", "poam:milestone")).toBe(true);
    expect(can("ENGINEER", "inventory:manage")).toBe(true);
    expect(can("ENGINEER", "scan:import")).toBe(false);
    expect(can("ENGINEER", "poam:update")).toBe(false);
  });

  it("ANALYST cannot approve mitigations or load catalog", () => {
    expect(can("ANALYST", "scan:import")).toBe(true);
    expect(can("ANALYST", "control:document")).toBe(true);
    expect(can("ANALYST", "mitigation:approve")).toBe(false);
    expect(can("ANALYST", "catalog:load")).toBe(false);
    expect(can("ANALYST", "apikey:manage")).toBe(false);
  });

  it("ISSM approves mitigations; only ADMIN loads catalog / manages keys", () => {
    expect(can("ISSM", "mitigation:approve")).toBe(true);
    expect(can("ISSM", "catalog:load")).toBe(false);
    expect(can("ADMIN", "catalog:load")).toBe(true);
    expect(can("ADMIN", "apikey:manage")).toBe(true);
  });

  it("every role's capabilities are a subset of ADMIN's", () => {
    const admin = new Set(ROLE_CAPABILITIES.ADMIN);
    for (const [role, caps] of Object.entries(ROLE_CAPABILITIES)) {
      for (const c of caps) expect(admin.has(c), `${role}:${c}`).toBe(true);
    }
  });
});
