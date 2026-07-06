import process from "node:process";

import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

// Local runs target the dev server. CI targets the production preview and
// reuses the build produced earlier in the workflow (pnpm serve, no rebuild).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: isCI ? "pnpm serve" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
