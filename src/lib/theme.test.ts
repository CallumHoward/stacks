import { describe, expect, it } from "vitest";

import { parseThemeForm, resolveTheme, safeRedirectPath } from "#/lib/theme";

describe("theme", () => {
  it.each(["light", "dark", "system"] as const)(
    "resolveTheme keeps the valid theme %s",
    (theme) => {
      expect(resolveTheme(theme)).toBe(theme);
    },
  );

  it("resolveTheme falls back to the default for unknown or missing values", () => {
    expect(resolveTheme("banana")).toBe("system");
    expect(resolveTheme(undefined)).toBe("system");
  });

  it("parseThemeForm reads the theme from submitted form data", () => {
    const data = new FormData();
    data.set("theme", "dark");

    expect(parseThemeForm(data)).toBe("dark");
  });

  it("parseThemeForm falls back when the field is missing or invalid", () => {
    expect(parseThemeForm(new FormData())).toBe("system");

    const invalid = new FormData();
    invalid.set("theme", "nope");
    expect(parseThemeForm(invalid)).toBe("system");
  });

  it("parseThemeForm rejects non-form input", () => {
    expect(() => parseThemeForm({})).toThrow(/form submission/);
  });

  it("safeRedirectPath returns the same-origin path and query", () => {
    expect(safeRedirectPath("http://localhost:3000/posts?page=2", "localhost:3000")).toBe(
      "/posts?page=2",
    );
  });

  it("safeRedirectPath rejects cross-origin, missing, or malformed referers", () => {
    expect(safeRedirectPath("http://evil.example/steal", "localhost:3000")).toBe("/");
    expect(safeRedirectPath(undefined, "localhost:3000")).toBe("/");
    expect(safeRedirectPath("not a url", "localhost:3000")).toBe("/");
  });

  it("safeRedirectPath collapses leading slashes to avoid protocol-relative open redirects", () => {
    const path = safeRedirectPath("https://localhost:3000//evil.example/x", "localhost:3000");

    expect(path).toBe("/evil.example/x");
    expect(path.startsWith("//")).toBe(false);
  });
});
