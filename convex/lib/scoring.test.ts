import { describe, expect, it } from "vitest";
import {
  getResultVisibility,
  isAllowedEventTransition,
  isAllowedResultTransition,
  isRestrictedEventTransition,
  rankStandings,
  resultTransitionNeedsReason,
  validatePoints,
} from "./scoring";

const policy = { minimumPoints: 0, maximumPoints: 100, allowDecimalPoints: false };

describe("validatePoints", () => {
  it("accepts whole numbers inside the range", () => {
    expect(validatePoints(42, policy)).toEqual({ ok: true, value: 42 });
  });

  it("rejects decimals when the policy forbids them", () => {
    const result = validatePoints(4.5, policy);
    expect(result.ok).toBe(false);
  });

  it("allows decimals when the policy permits them", () => {
    expect(validatePoints(4.5, { ...policy, allowDecimalPoints: true })).toEqual({
      ok: true,
      value: 4.5,
    });
  });

  it("rejects values outside the range, NaN, and infinity", () => {
    expect(validatePoints(-1, policy).ok).toBe(false);
    expect(validatePoints(101, policy).ok).toBe(false);
    expect(validatePoints(Number.NaN, policy).ok).toBe(false);
    expect(validatePoints(Number.POSITIVE_INFINITY, policy).ok).toBe(false);
  });
});

describe("rankStandings", () => {
  it("shares ranks on ties and skips the next rank", () => {
    const ranked = rankStandings([
      { schoolId: "a", schoolName: "Alpha", slug: "alpha", points: 10, provisional: false },
      { schoolId: "b", schoolName: "Beta", slug: "beta", points: 10, provisional: false },
      { schoolId: "c", schoolName: "Gamma", slug: "gamma", points: 5, provisional: false },
    ]);
    expect(ranked.map((row) => row.rank)).toEqual([1, 1, 3]);
  });

  it("orders equal scores by school name", () => {
    const ranked = rankStandings([
      { schoolId: "z", schoolName: "Zeta", slug: "zeta", points: 7, provisional: false },
      { schoolId: "a", schoolName: "Alpha", slug: "alpha", points: 7, provisional: false },
    ]);
    expect(ranked.map((row) => row.schoolName)).toEqual(["Alpha", "Zeta"]);
  });
});

describe("transitions", () => {
  it("allows normal lifecycle moves but not reopening completed events", () => {
    expect(isAllowedEventTransition("upcoming", "live")).toBe(true);
    expect(isAllowedEventTransition("live", "completed")).toBe(true);
    expect(isAllowedEventTransition("cancelled", "upcoming")).toBe(true);
    expect(isAllowedEventTransition("live", "upcoming")).toBe(false);
    expect(isRestrictedEventTransition("completed", "live")).toBe(true);
    expect(isRestrictedEventTransition("cancelled", "upcoming")).toBe(true);
  });

  it("requires a reason to reopen final results or hide results", () => {
    expect(isAllowedResultTransition("not_ready", "provisional")).toBe(true);
    expect(isAllowedResultTransition("final", "provisional")).toBe(true);
    expect(isAllowedResultTransition("provisional", "not_ready")).toBe(true);
    expect(resultTransitionNeedsReason("final", "provisional")).toBe(true);
    expect(resultTransitionNeedsReason("provisional", "not_ready")).toBe(true);
    expect(resultTransitionNeedsReason("not_ready", "final")).toBe(false);
  });

  it("hides results for unpublished events and provisional results when disabled", () => {
    expect(
      getResultVisibility({ publicationStatus: "draft", resultStatus: "final" }, true),
    ).toBe("none");
    expect(
      getResultVisibility(
        { publicationStatus: "published", resultStatus: "provisional" },
        false,
      ),
    ).toBe("none");
    expect(
      getResultVisibility(
        { publicationStatus: "published", resultStatus: "provisional" },
        true,
      ),
    ).toBe("provisional");
  });
});
