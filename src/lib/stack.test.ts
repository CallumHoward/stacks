import { describe, expect, it } from "vitest";

import { buildStackLayout, ciStatus } from "#/lib/stack";
import type { PullRequest } from "#/lib/stack";

function makePr(
  overrides: Partial<PullRequest> & Pick<PullRequest, "number" | "headRefName" | "baseRefName">,
): PullRequest {
  return {
    title: `PR ${overrides.number}`,
    url: `https://example.com/${overrides.number}`,
    isDraft: false,
    reviewDecision: "",
    additions: 0,
    deletions: 0,
    updatedAt: "2026-07-06T00:00:00Z",
    author: { login: "callum" },
    statusCheckRollup: null,
    ...overrides,
  };
}

describe("stack", () => {
  it("links a linear stack rightward from the trunk with increasing depth", () => {
    const layout = buildStackLayout(
      [
        makePr({ number: 1, headRefName: "a", baseRefName: "main" }),
        makePr({ number: 2, headRefName: "b", baseRefName: "a" }),
        makePr({ number: 3, headRefName: "c", baseRefName: "b" }),
      ],
      "callum",
      true,
    );

    expect(layout.stackCount).toBe(1);
    expect(layout.prCount).toBe(3);
    expect(layout.edges.map((edge) => [edge.source, edge.target])).toEqual(
      expect.arrayContaining([
        ["trunk:a", "a"],
        ["a", "b"],
        ["b", "c"],
      ]),
    );

    const byId = new Map(layout.nodes.map((node) => [node.id, node]));
    const trunkX = byId.get("trunk:a")!.position.x;
    expect(byId.get("a")!.position.x).toBeGreaterThan(trunkX);
    expect(byId.get("b")!.position.x).toBeGreaterThan(byId.get("a")!.position.x);
    expect(byId.get("c")!.position.x).toBeGreaterThan(byId.get("b")!.position.x);
  });

  it("centers a parent beside its forked children", () => {
    const layout = buildStackLayout(
      [
        makePr({ number: 1, headRefName: "a", baseRefName: "main" }),
        makePr({ number: 2, headRefName: "b", baseRefName: "a" }),
        makePr({ number: 3, headRefName: "c", baseRefName: "a" }),
      ],
      "callum",
      true,
    );

    const byId = new Map(layout.nodes.map((node) => [node.id, node]));
    const parentY = byId.get("a")!.position.y;
    expect(parentY).toBe((byId.get("b")!.position.y + byId.get("c")!.position.y) / 2);
    expect(byId.get("b")!.position.y).not.toBe(byId.get("c")!.position.y);
  });

  it("keeps a whole stack when any PR in it is the viewer's", () => {
    const layout = buildStackLayout(
      [
        makePr({ number: 1, headRefName: "a", baseRefName: "main", author: { login: "someone" } }),
        makePr({ number: 2, headRefName: "b", baseRefName: "a", author: { login: "callum" } }),
        makePr({ number: 3, headRefName: "x", baseRefName: "main", author: { login: "someone" } }),
      ],
      "callum",
      true,
    );

    const ids = layout.nodes.map((node) => node.id);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
    expect(ids).not.toContain("x");
    expect(layout.stackCount).toBe(1);
  });

  it("shows every stack when mineOnly is off", () => {
    const layout = buildStackLayout(
      [
        makePr({ number: 1, headRefName: "a", baseRefName: "main", author: { login: "someone" } }),
        makePr({ number: 2, headRefName: "x", baseRefName: "main", author: { login: "other" } }),
      ],
      "callum",
      false,
    );

    expect(layout.stackCount).toBe(2);
    expect(layout.prCount).toBe(2);
  });
  it("reports none for a missing or empty rollup", () => {
    expect(ciStatus(null)).toBe("none");
    expect(ciStatus([])).toBe("none");
  });

  it("reports failing when any check failed, even alongside pending ones", () => {
    expect(
      ciStatus([{ conclusion: "SUCCESS" }, { status: "IN_PROGRESS" }, { conclusion: "FAILURE" }]),
    ).toBe("failing");
  });

  it("reports pending when checks are still running and none failed", () => {
    expect(ciStatus([{ conclusion: "SUCCESS" }, { status: "QUEUED" }])).toBe("pending");
  });

  it("reports passing when every check concluded successfully", () => {
    expect(ciStatus([{ conclusion: "SUCCESS" }, { state: "SUCCESS" }])).toBe("passing");
  });
});
