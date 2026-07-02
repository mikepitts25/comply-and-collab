import { describe, it, expect } from "vitest";
import { FRAMEWORKS } from "@/lib/frameworks";
import { ISO_27001 } from "@/lib/data/frameworks/iso-27001";
import { CIS_V8 } from "@/lib/data/frameworks/cis-v8";

describe("framework registry", () => {
  it("registers ISO 27001 and CIS v8 under their keys", () => {
    expect(FRAMEWORKS["iso27001"]).toBe(ISO_27001);
    expect(FRAMEWORKS["cis8"]).toBe(CIS_V8);
  });
});

describe("ISO/IEC 27001:2022 dataset integrity", () => {
  it("has all 93 Annex A controls in the 4 themes (37/8/14/34)", () => {
    expect(ISO_27001.requirements).toHaveLength(93);
    const byGroup = (g: string) => ISO_27001.requirements.filter((r) => r.group === g).length;
    expect(byGroup("A.5")).toBe(37);
    expect(byGroup("A.6")).toBe(8);
    expect(byGroup("A.7")).toBe(14);
    expect(byGroup("A.8")).toBe(34);
  });

  it("gives every control a unique id, text, and >=1 800-53 mapping", () => {
    const ids = new Set<string>();
    const groupKeys = new Set(ISO_27001.groups.map((g) => g.key));
    for (const r of ISO_27001.requirements) {
      expect(ids.has(r.id)).toBe(false);
      ids.add(r.id);
      expect(r.text.length).toBeGreaterThan(0);
      expect(r.controls.length).toBeGreaterThan(0);
      expect(groupKeys.has(r.group)).toBe(true);
      for (const c of r.controls) expect(c).toMatch(/^[A-Z]{2}-\d+$/);
    }
  });
});

describe("CIS Controls v8 dataset integrity", () => {
  it("has all 18 controls, each with a tier and 800-53 mapping", () => {
    expect(CIS_V8.requirements).toHaveLength(18);
    for (const r of CIS_V8.requirements) {
      expect(r.tier).toMatch(/^IG[123]$/);
      expect(r.controls.length).toBeGreaterThan(0);
      for (const c of r.controls) expect(c).toMatch(/^[A-Z]{2}-\d+$/);
    }
  });

  it("numbers CIS-1 through CIS-18 without gaps", () => {
    const nums = CIS_V8.requirements.map((r) => Number(r.id.split("-")[1])).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
  });
});
