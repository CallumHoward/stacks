import { describe, expect, it } from "vitest";

import { ghFailureMessage, parseRepoInput } from "#/lib/github-input";

describe("github-input", () => {
  it("accepts owner/repo and the empty default", () => {
    expect(parseRepoInput({ repo: "owner/repo" })).toEqual({ repo: "owner/repo" });
    expect(parseRepoInput({ repo: "Checkbox-Technology-Pty-Ltd/nomos-ui" })).toEqual({
      repo: "Checkbox-Technology-Pty-Ltd/nomos-ui",
    });
    expect(parseRepoInput({ repo: "" })).toEqual({ repo: "" });
    expect(parseRepoInput({})).toEqual({ repo: "" });
  });

  it("rejects values that are not a plain owner/repo", () => {
    expect(() => parseRepoInput({ repo: "owner/repo/extra" })).toThrow(
      "Repository must look like owner/repo",
    );
    expect(() => parseRepoInput({ repo: "--repo=evil" })).toThrow(
      "Repository must look like owner/repo",
    );
    expect(() => parseRepoInput({ repo: 42 })).toThrow("Repository must look like owner/repo");
  });

  it("prefers gh's stderr over the generic failure message", () => {
    const error = Object.assign(new Error("exec failed"), { stderr: "HTTP 401: auth required\n" });
    expect(ghFailureMessage("api", error)).toBe("HTTP 401: auth required");
  });

  it("falls back to a generic message when stderr is empty or absent", () => {
    expect(ghFailureMessage("pr", new Error("boom"))).toBe("gh pr failed");
    expect(ghFailureMessage("pr", Object.assign(new Error("x"), { stderr: " " }))).toBe(
      "gh pr failed",
    );
  });
});
