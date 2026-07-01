import { describe, it, expect } from "vitest";
import { parseEdipi } from "@/lib/cac";
import { severityFromCat, severityFromNessus, extractCcis } from "@/lib/parsers/common";
import { poamNumber, daysUntil } from "@/lib/format";
import { hashKey, generateApiKey } from "@/lib/apikey";
import { poamRow, POAM_HEADERS } from "@/lib/export/poam-rows";

describe("CAC EDIPI parsing", () => {
  it("extracts EDIPI from a DoD CN", () => {
    expect(parseEdipi("CN=DOE.JANE.A.1234567890,OU=USA,O=U.S. Government,C=US")).toBe("1234567890");
  });
  it("returns null when absent", () => {
    expect(parseEdipi("CN=SomeService,OU=USA")).toBeNull();
    expect(parseEdipi(null)).toBeNull();
  });
});

describe("severity normalization", () => {
  it("maps STIG CAT/severity", () => {
    expect(severityFromCat("high")).toBe("HIGH");
    expect(severityFromCat("medium")).toBe("MEDIUM");
    expect(severityFromCat("low")).toBe("LOW");
    expect(severityFromCat(undefined)).toBe("MEDIUM");
  });
  it("maps Nessus risk factor / numeric", () => {
    expect(severityFromNessus("Critical", "4")).toBe("CRITICAL");
    expect(severityFromNessus(undefined, 3)).toBe("HIGH");
    expect(severityFromNessus("None", "0")).toBe("INFO");
  });
});

describe("CCI extraction", () => {
  it("pulls CCI ids from mixed input", () => {
    expect(extractCcis(["CCI-000366", "junk", "cci-001453"])).toEqual(["CCI-000366", "CCI-001453"]);
    expect(extractCcis("see CCI-000048 and CCI-000048")).toEqual(["CCI-000048"]);
  });
});

describe("formatting", () => {
  it("zero-pads POA&M numbers", () => {
    expect(poamNumber(1)).toBe("POAM-0001");
    expect(poamNumber(42)).toBe("POAM-0042");
  });
  it("computes days until", () => {
    const future = new Date(Date.now() + 3 * 86_400_000);
    expect(daysUntil(future)).toBeGreaterThanOrEqual(2);
    expect(daysUntil(null)).toBeNull();
  });
});

describe("API keys", () => {
  it("generates a prefixed key whose hash is stable", () => {
    const k = generateApiKey();
    expect(k.plaintext.startsWith("cc_")).toBe(true);
    expect(k.plaintext.startsWith(k.prefix)).toBe(true);
    expect(hashKey(k.plaintext)).toBe(k.hash);
    expect(k.hash).toHaveLength(64);
  });
  it("produces unique keys", () => {
    expect(generateApiKey().plaintext).not.toBe(generateApiKey().plaintext);
  });
});

describe("POA&M export row shaping", () => {
  const poam: any = {
    number: 3,
    weakness: "Weak thing",
    severity: "HIGH",
    status: "OPEN",
    riskRating: "HIGH",
    residualRisk: null,
    sourceIdentifier: "ACAS Plugin 190123",
    resourcesRequired: null,
    recommendation: "Patch it",
    scheduledCompletion: new Date("2026-07-15"),
    owner: { name: "Riley", role: "ANALYST" },
    controls: [{ controlId: "SI-2" }, { controlId: "RA-5" }, { controlId: "SI-2" }],
    milestones: [{ description: "Do", dueDate: null, completed: false }],
    findings: [{ stigId: "RHEL-08-010120", asset: { hostname: "web01" } }],
    mitigations: [{ title: "Interim fix" }],
  };
  it("aligns row length to headers and de-dups controls/devices", () => {
    const row = poamRow(poam);
    expect(row).toHaveLength(POAM_HEADERS.length);
    expect(row[0]).toBe("POAM-0003");
    expect(row[2]).toBe("SI-2, RA-5"); // de-duped
    expect(row[12]).toContain("CAT I");
    expect(row[13]).toBe("web01");
  });
});
