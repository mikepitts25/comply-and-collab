import { describe, it, expect } from "vitest";
import { findingStatusForApprovedDeviation } from "@/lib/deviations";

describe("findingStatusForApprovedDeviation", () => {
  it("retires false positives as NOT_A_FINDING", () => {
    expect(findingStatusForApprovedDeviation("FALSE_POSITIVE")).toBe("NOT_A_FINDING");
  });
  it("retires operational requirements as NOT_APPLICABLE", () => {
    expect(findingStatusForApprovedDeviation("OPERATIONAL_REQUIREMENT")).toBe("NOT_APPLICABLE");
  });
});
