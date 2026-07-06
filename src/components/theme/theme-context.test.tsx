import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useTheme } from "#/components/theme/theme-context";

function Consumer() {
  useTheme();
  return null;
}

describe("useTheme", () => {
  it("throws when used outside a ThemeProvider", () => {
    // Swallow React's expected error-boundary console output for this render.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Consumer />)).toThrow(/within a ThemeProvider/);

    spy.mockRestore();
  });
});
