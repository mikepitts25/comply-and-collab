import { describe, it, expect } from "vitest";
import { deriveStatus } from "@/lib/cmmc";
import {
  CMMC_REQUIREMENTS,
  CMMC_FAMILIES,
  CMMC_TOTAL,
  CMMC_L1_COUNT,
  familyKeyOf,
} from "@/lib/data/cmmc-800-171";

describe("800-171 dataset integrity", () => {
  it("has all 110 requirements across 14 families", () => {
    expect(CMMC_TOTAL).toBe(110);
    expect(CMMC_REQUIREMENTS).toHaveLength(110);
    expect(Object.keys(CMMC_FAMILIES)).toHaveLength(14);
  });

  it("gives every requirement a family, control mapping, and unique id", () => {
    const ids = new Set<string>();
    for (const r of CMMC_REQUIREMENTS) {
      expect(CMMC_FAMILIES[familyKeyOf(r.id)]).toBeTruthy();
      expect(r.controls.length).toBeGreaterThan(0);
      expect(r.text.length).toBeGreaterThan(0);
      expect(ids.has(r.id)).toBe(false);
      ids.add(r.id);
    }
  });

  it("flags the CMMC Level 1 subset", () => {
    // FAR 52.204-21 / CMMC L1 corresponds to 17 of the 800-171 requirements.
    expect(CMMC_L1_COUNT).toBe(17);
    expect(CMMC_REQUIREMENTS.find((r) => r.id === "3.1.1")!.level).toBe(1);
    expect(CMMC_REQUIREMENTS.find((r) => r.id === "3.1.3")!.level).toBe(2);
  });
});

describe("deriveStatus rollup", () => {
  it("MET only when all mapped controls are implemented/inherited", () => {
    expect(deriveStatus(["IMPLEMENTED"])).toBe("MET");
    expect(deriveStatus(["IMPLEMENTED", "INHERITED"])).toBe("MET");
  });
  it("PARTIAL when some progress but not all met", () => {
    expect(deriveStatus(["IMPLEMENTED", "UNDOCUMENTED"])).toBe("PARTIAL");
    expect(deriveStatus(["PARTIALLY_IMPLEMENTED"])).toBe("PARTIAL");
  });
  it("PLANNED when only planned", () => {
    expect(deriveStatus(["PLANNED"])).toBe("PLANNED");
  });
  it("NOT_MET when undocumented or not implemented", () => {
    expect(deriveStatus(["UNDOCUMENTED"])).toBe("NOT_MET");
    expect(deriveStatus(["NOT_IMPLEMENTED"])).toBe("NOT_MET");
    expect(deriveStatus([])).toBe("NOT_MET");
  });
  it("NOT_APPLICABLE when all mapped controls are N/A", () => {
    expect(deriveStatus(["NOT_APPLICABLE"])).toBe("NOT_APPLICABLE");
  });
});
