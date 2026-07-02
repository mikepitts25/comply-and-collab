import { describe, it, expect } from "vitest";
import { FRAMEWORKS } from "@/lib/frameworks";
import { NIST_CSF2 } from "@/lib/data/frameworks/nist-csf2";
import { SOC2 } from "@/lib/data/frameworks/soc2";

describe("framework registry (CSF 2.0 + SOC 2)", () => {
  it("registers csf2 and soc2", () => {
    expect(FRAMEWORKS["csf2"]).toBe(NIST_CSF2);
    expect(FRAMEWORKS["soc2"]).toBe(SOC2);
  });
});

describe("NIST CSF 2.0 dataset integrity", () => {
  it("has all 22 categories across the 6 functions", () => {
    expect(NIST_CSF2.requirements).toHaveLength(22);
    expect(NIST_CSF2.groups.map((g) => g.key)).toEqual(["GV", "ID", "PR", "DE", "RS", "RC"]);
    const byFn = (fn: string) => NIST_CSF2.requirements.filter((r) => r.group === fn).length;
    expect(byFn("GV")).toBe(6);
    expect(byFn("ID")).toBe(3);
    expect(byFn("PR")).toBe(5);
    expect(byFn("DE")).toBe(2);
    expect(byFn("RS")).toBe(4);
    expect(byFn("RC")).toBe(2);
  });

  it("prefixes every category id with its function and maps to 800-53", () => {
    for (const r of NIST_CSF2.requirements) {
      expect(r.id.startsWith(`${r.group}.`)).toBe(true);
      expect(r.controls.length).toBeGreaterThan(0);
      for (const c of r.controls) expect(c).toMatch(/^[A-Z]{2}-\d+$/);
    }
  });
});

describe("SOC 2 TSC dataset integrity", () => {
  it("has the 33 common criteria plus A1 (3) and C1 (2)", () => {
    const cc = SOC2.requirements.filter((r) => r.group.startsWith("CC"));
    expect(cc).toHaveLength(33);
    expect(SOC2.requirements.filter((r) => r.group === "A1")).toHaveLength(3);
    expect(SOC2.requirements.filter((r) => r.group === "C1")).toHaveLength(2);
    expect(SOC2.requirements).toHaveLength(38);
  });

  it("keeps criterion ids inside their series and maps to 800-53", () => {
    const ids = new Set<string>();
    for (const r of SOC2.requirements) {
      expect(r.id.startsWith(r.group + ".")).toBe(true);
      expect(ids.has(r.id)).toBe(false);
      ids.add(r.id);
      for (const c of r.controls) expect(c).toMatch(/^[A-Z]{2}-\d+$/);
    }
  });
});
