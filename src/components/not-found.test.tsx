import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NotFound } from "#/components/not-found";

import { axe } from "../../vitest-setup";

describe("NotFound", () => {
  it("renders the 404 status heading", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("404");
  });

  it("shows the page-not-found message", () => {
    render(<NotFound />);

    expect(screen.getByText("Page not found")).toBeVisible();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<NotFound />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
