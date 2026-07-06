import { expect, test } from "@playwright/test";

test.describe("home page", () => {
  test("renders and the console stays clean", async ({ page }) => {
    const consoleErrors: Array<string> = [];
    const pageErrors: Array<string> = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await page.goto("/");

    // Web-first assertion auto-waits for the element, giving the page time to
    // render and hydrate; the route renders <main>Hello world</main>.
    await expect(page.locator("main")).toContainText("Hello world");

    expect(pageErrors, "uncaught page exceptions").toEqual([]);
    expect(consoleErrors, "browser console errors").toEqual([]);
  });
});
