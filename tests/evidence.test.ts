import { describe, it, expect } from "vitest";
import { sha256Hex, validateEvidenceFile, MAX_EVIDENCE_BYTES } from "@/lib/evidence";

describe("sha256Hex", () => {
  it("hashes bytes to the known digest", () => {
    // sha256("abc")
    expect(sha256Hex(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });
});

describe("validateEvidenceFile", () => {
  it("accepts files within the limit", () => {
    expect(validateEvidenceFile(1024, "config.txt")).toBeNull();
    expect(validateEvidenceFile(MAX_EVIDENCE_BYTES, "big.pdf")).toBeNull();
  });
  it("rejects oversize files", () => {
    expect(validateEvidenceFile(MAX_EVIDENCE_BYTES + 1, "huge.bin")).toMatch(/limit/i);
  });
  it("rejects path-like filenames", () => {
    expect(validateEvidenceFile(10, "../../etc/passwd")).toMatch(/invalid/i);
    expect(validateEvidenceFile(10, "a\\b.txt")).toMatch(/invalid/i);
  });
});
