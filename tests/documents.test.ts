import { describe, it, expect } from "vitest";
import { canTransition, allowedTransitions, isReviewDecision } from "@/lib/documents";

describe("document review-state machine", () => {
  it("follows the happy path draft -> ready -> in review -> approved -> archived", () => {
    expect(canTransition("DRAFT", "READY_FOR_REVIEW")).toBe(true);
    expect(canTransition("READY_FOR_REVIEW", "IN_REVIEW")).toBe(true);
    expect(canTransition("IN_REVIEW", "APPROVED")).toBe(true);
    expect(canTransition("APPROVED", "ARCHIVED")).toBe(true);
  });
  it("supports the changes-requested loop", () => {
    expect(canTransition("IN_REVIEW", "CHANGES_REQUESTED")).toBe(true);
    expect(canTransition("CHANGES_REQUESTED", "READY_FOR_REVIEW")).toBe(true);
  });
  it("blocks skipping and backwards jumps", () => {
    expect(canTransition("DRAFT", "APPROVED")).toBe(false);
    expect(canTransition("DRAFT", "IN_REVIEW")).toBe(false);
    expect(canTransition("ARCHIVED", "APPROVED")).toBe(false);
    expect(canTransition("APPROVED", "IN_REVIEW")).toBe(false);
  });
  it("archived documents can only be restored to draft", () => {
    expect(allowedTransitions("ARCHIVED")).toEqual(["DRAFT"]);
  });
  it("classifies review decisions as senior moves", () => {
    expect(isReviewDecision("APPROVED")).toBe(true);
    expect(isReviewDecision("CHANGES_REQUESTED")).toBe(true);
    expect(isReviewDecision("IN_REVIEW")).toBe(true);
    expect(isReviewDecision("READY_FOR_REVIEW")).toBe(false);
    expect(isReviewDecision("DRAFT")).toBe(false);
  });
});
