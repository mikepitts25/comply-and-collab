import { describe, it, expect } from "vitest";
import { buildCkl, buildCklb, deriveBenchmark } from "@/lib/export/ckl";
import { parseScan } from "@/lib/parsers";
import type { ExportAsset, ExportFinding } from "@/lib/export/ckl";

const asset: ExportAsset = {
  hostname: "web01",
  fqdn: "web01.demo.mil",
  ipAddress: "10.10.20.11",
  macAddress: "00:50:56:9A:11:01",
};

const findings: ExportFinding[] = [
  {
    ruleId: "SV-230264r627750_rule",
    groupId: "V-230264",
    stigId: "RHEL-08-010120",
    title: "RHEL 8 must encrypt all stored passwords with a FIPS 140-2 approved algorithm.",
    description: "Passwords stored without approved crypto are vulnerable.",
    severity: "MEDIUM",
    status: "OPEN",
    checkText: "grep -i crypt /etc/login.defs",
    fixText: "Set ENCRYPT_METHOD SHA512.",
    comments: "Engineer to fix next window.",
    ccis: [{ id: "CCI-000196" }],
  },
  {
    ruleId: "SV-230502r627750_rule",
    groupId: "V-230502",
    stigId: "RHEL-08-010060",
    title: "RHEL 8 must display the Standard Mandatory DoD Notice and Consent Banner.",
    description: "The DoD banner notifies users of monitoring.",
    severity: "LOW",
    status: "NOT_A_FINDING",
    checkText: "Verify /etc/issue.",
    fixText: "Populate /etc/issue.",
    comments: "Banner present & verified.",
    ccis: [{ id: "CCI-000048" }],
  },
  {
    // Different benchmark family -> separate iSTIG
    ruleId: "SV-254292r848652_rule",
    groupId: "V-254292",
    stigId: "WN22-AC-000010",
    title: "Windows Server 2022 account lockout threshold must be 3 or fewer.",
    description: "Lockout mitigates brute force.",
    severity: "CRITICAL",
    status: "NOT_APPLICABLE",
    checkText: "secpol.msc",
    fixText: "Set threshold to 3.",
    comments: "N/A — no local accounts.",
    ccis: [{ id: "CCI-000044" }],
  },
];

describe("deriveBenchmark", () => {
  it("keys by the leading token of the rule version", () => {
    expect(deriveBenchmark("RHEL-08-010120")).toEqual({ key: "RHEL", title: "RHEL STIG" });
    expect(deriveBenchmark("WN22-AC-000010").key).toBe("WN22");
    expect(deriveBenchmark(null).key).toBe("STIG");
  });
});

describe(".ckl export round-trips through the importer", () => {
  const xml = buildCkl(asset, findings);
  const parsed = parseScan("web01_export.ckl", xml);

  it("is detected as a STIG .ckl for the right asset", () => {
    expect(parsed.scanType).toBe("STIG_CKL");
    expect(parsed.assets[0].hostname).toBe("web01");
  });

  it("preserves every rule with status + severity + CCIs", () => {
    const all = parsed.assets[0].findings;
    expect(all).toHaveLength(3);

    const pw = all.find((f) => f.ruleId === "SV-230264r627750_rule")!;
    expect(pw.status).toBe("OPEN");
    expect(pw.severity).toBe("MEDIUM");
    expect(pw.ccis).toContain("CCI-000196");
    expect(pw.stigId).toBe("RHEL-08-010120");

    const banner = all.find((f) => f.ruleId === "SV-230502r627750_rule")!;
    expect(banner.status).toBe("NOT_A_FINDING");

    const win = all.find((f) => f.ruleId === "SV-254292r848652_rule")!;
    expect(win.status).toBe("NOT_APPLICABLE");
    // CRITICAL has no STIG equivalent and normalizes down to HIGH.
    expect(win.severity).toBe("HIGH");
  });

  it("escapes XML-special characters safely", () => {
    const tricky = buildCkl(asset, [
      { ...findings[0], title: "A & B <tag> \"q\"", ccis: [] },
    ]);
    expect(tricky).toContain("A &amp; B &lt;tag&gt; &quot;q&quot;");
    expect(() => parseScan("x.ckl", tricky)).not.toThrow();
  });
});

describe(".cklb export round-trips through the importer", () => {
  const json = buildCklb(asset, findings);
  const parsed = parseScan("web01_export.cklb", json);

  it("is valid JSON detected as .cklb", () => {
    expect(() => JSON.parse(json)).not.toThrow();
    expect(parsed.scanType).toBe("STIG_CKLB");
  });

  it("preserves statuses across the round trip", () => {
    const all = parsed.assets[0].findings;
    expect(all).toHaveLength(3);
    expect(all.find((f) => f.ruleId === "SV-230264r627750_rule")!.status).toBe("OPEN");
    expect(all.find((f) => f.ruleId === "SV-230502r627750_rule")!.status).toBe("NOT_A_FINDING");
  });
});
