import { describe, it, expect } from "vitest";
import { familyPolicyState, nextReviewDate, type PolicyDocLite } from "@/lib/policies";
import { icsEscape, icsDate, buildIcs } from "@/lib/calendar";

const doc = (over: Partial<PolicyDocLite>): PolicyDocLite => ({
  id: "d1", title: "AC Policy", status: "APPROVED", controls: ["AC-1"], nextReviewDue: null, ...over,
});

describe("familyPolicyState", () => {
  const now = new Date("2026-07-01");
  it("is MISSING with no docs and CURRENT with a fresh approval", () => {
    expect(familyPolicyState([], now)).toBe("MISSING");
    expect(familyPolicyState([doc({ nextReviewDue: new Date("2027-01-01") })], now)).toBe("CURRENT");
    expect(familyPolicyState([doc({ nextReviewDue: null })], now)).toBe("CURRENT"); // no cadence set
  });
  it("is REVIEW_OVERDUE when every approval is past its review date", () => {
    expect(familyPolicyState([doc({ nextReviewDue: new Date("2026-01-01") })], now)).toBe("REVIEW_OVERDUE");
  });
  it("is IN_PROGRESS when only unapproved drafts exist; archived-only is MISSING", () => {
    expect(familyPolicyState([doc({ status: "READY_FOR_REVIEW" })], now)).toBe("IN_PROGRESS");
    expect(familyPolicyState([doc({ status: "ARCHIVED" })], now)).toBe("MISSING");
  });
});

describe("nextReviewDate", () => {
  it("adds the cadence in months, or null when unset", () => {
    expect(nextReviewDate(new Date("2026-01-15"), 12)?.toISOString().slice(0, 10)).toBe("2027-01-15");
    expect(nextReviewDate(new Date("2026-01-15"), null)).toBeNull();
  });
});

describe("ICS export", () => {
  it("escapes special characters and formats all-day dates", () => {
    expect(icsEscape("a,b;c\nd")).toBe("a\\,b\\;c\\nd");
    expect(icsDate(new Date("2026-07-04T12:00:00Z"))).toBe("20260704");
  });
  it("builds a valid VCALENDAR with one VEVENT per event", () => {
    const ics = buildIcs([
      { date: new Date("2026-08-01"), kind: "ATO", title: "MDP ATO expires", system: "MDP", href: "/systems/x" },
      { date: new Date("2026-09-01"), kind: "POA&M", title: "Fix, thing", system: "MDP", href: "/poams/y" },
    ]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260801");
    expect(ics).toContain("SUMMARY:[MDP] POA&M: Fix\\, thing");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
