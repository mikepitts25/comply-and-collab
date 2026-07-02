import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv, mapHeaders, parseSheetDate } from "@/lib/import/sheet";
import {
  parsePoamRows,
  parsePoamNumber,
  parseSeverityCell,
  parsePoamStatusCell,
  parseMilestonesCell,
} from "@/lib/import/poam-import";
import { normalizeControlIdCell, parseControlStatusCell } from "@/lib/import/controls-import";
import { POAM_HEADERS } from "@/lib/export/poam-rows";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, commas, and CRLF", () => {
    const rows = parseCsv('a,"b,1","say ""hi"""\r\nc,d,e\n');
    expect(rows).toEqual([["a", "b,1", 'say "hi"'], ["c", "d", "e"]]);
  });
  it("keeps embedded newlines inside quoted cells", () => {
    const rows = parseCsv('h1,h2\n"line1\nline2",x');
    expect(rows[1][0]).toBe("line1\nline2");
  });
});

describe("header + cell parsing", () => {
  it("matches headers case/punctuation-insensitively", () => {
    const cols = mapHeaders(["POA&M Item ID", "  status "], { id: ["POAM ID", "POA&M Item ID"], status: ["Status"] });
    expect(cols.id).toBe(0);
    expect(cols.status).toBe(1);
  });
  it("parses POA&M numbers from POAM-0001 and bare digits", () => {
    expect(parsePoamNumber("POAM-0007")).toBe(7);
    expect(parsePoamNumber("12")).toBe(12);
    expect(parsePoamNumber("")).toBeNull();
  });
  it("maps severities from eMASS and CAT vocabularies", () => {
    expect(parseSeverityCell("Very High")).toBe("CRITICAL");
    expect(parseSeverityCell("CAT I")).toBe("HIGH");
    expect(parseSeverityCell("Moderate")).toBe("MEDIUM");
    expect(parseSeverityCell("CAT III")).toBe("LOW");
  });
  it("maps statuses tolerantly", () => {
    expect(parsePoamStatusCell("Ongoing")).toBe("ONGOING");
    expect(parsePoamStatusCell("Risk Accepted")).toBe("RISK_ACCEPTED");
    expect(parsePoamStatusCell("Completed")).toBe("COMPLETED");
  });
  it("parses milestones with due dates and completion flags", () => {
    const ms = parseMilestonesCell("Fix X (due Jan 5, 2026) [complete]; Verify Y (due 2026-02-01); Plain");
    expect(ms).toHaveLength(3);
    expect(ms[0]).toMatchObject({ description: "Fix X", completed: true });
    expect(ms[0].dueDate?.getFullYear()).toBe(2026);
    expect(ms[1].completed).toBe(false);
    expect(ms[2]).toMatchObject({ description: "Plain", dueDate: null });
  });
  it("normalizes control ids and statuses for the control tracker", () => {
    expect(normalizeControlIdCell("ac-02")).toBe("AC-2");
    expect(normalizeControlIdCell("AC-2 (1)")).toBe("AC-2(1)");
    expect(normalizeControlIdCell("not a control")).toBeNull();
    expect(parseControlStatusCell("Partially Implemented")).toBe("PARTIALLY_IMPLEMENTED");
    expect(parseControlStatusCell("In Place")).toBe("IMPLEMENTED");
    expect(parseControlStatusCell("N/A")).toBe("NOT_APPLICABLE");
  });
});

describe("POA&M sheet parsing", () => {
  it("accepts the app's own export headers (round-trip)", () => {
    const row = new Array(POAM_HEADERS.length).fill("");
    row[0] = "POAM-0003"; // POA&M Item ID
    row[1] = "Weak TLS configuration"; // Control Vulnerability Description
    row[6] = "Jan 5, 2026"; // Scheduled Completion Date
    row[7] = "Reissue cert (due Feb 1, 2026)"; // Milestones
    row[10] = "Ongoing"; // Status
    row[16] = "CAT II"; // Severity
    const { rows, errors } = parsePoamRows([[...POAM_HEADERS], row]);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ number: 3, weakness: "Weak TLS configuration", status: "ONGOING", severity: "MEDIUM" });
    expect(rows[0].scheduledCompletion?.getFullYear()).toBe(2026);
    expect(rows[0].milestones[0].description).toBe("Reissue cert");
  });

  it("parses the shipped sample workbook", () => {
    const csv = readFileSync(join(process.cwd(), "samples", "poam-import-sample.csv"), "utf8");
    const { rows, errors } = parsePoamRows(parseCsv(csv));
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0].severity).toBe("HIGH");
    expect(rows[0].number).toBeNull(); // blank id -> create new
    expect(rows[1].milestones.some((m) => m.completed)).toBe(true);
  });

  it("fails clearly without a weakness column", () => {
    const { rows, errors } = parsePoamRows([["Foo", "Bar"], ["1", "2"]]);
    expect(rows).toEqual([]);
    expect(errors[0]).toMatch(/weakness/i);
  });
});

describe("date parsing", () => {
  it("accepts export-format and ISO dates", () => {
    expect(parseSheetDate("Jan 5, 2026")?.getFullYear()).toBe(2026);
    expect(parseSheetDate("2026-01-05")?.getFullYear()).toBe(2026);
    expect(parseSheetDate("")).toBeNull();
    expect(parseSheetDate("garbage")).toBeNull();
  });
});
