import { defineConfig } from "@playwright/test";

// E2E smoke tests. Expect a seeded database (npm run db:seed).
// CHROMIUM_PATH overrides the browser binary for environments with a
// pre-installed Chromium (no download); CI runs `playwright install chromium`.
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {},
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
