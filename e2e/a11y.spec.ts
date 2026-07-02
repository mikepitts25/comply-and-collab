import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Automated accessibility (Section 508 / WCAG 2.1 AA) scans of key pages.
// Fails on serious and critical violations so regressions can't land silently.

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("analyst@demo.mil");
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("heading", { name: "Compliance Dashboard" })).toBeVisible();
}

async function expectNoSeriousViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "section508"])
    .analyze();
  const serious = results.violations.filter((v) =>
    ["serious", "critical"].includes(v.impact ?? "")
  );
  expect(
    serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`)
  ).toEqual([]);
}

test("login page has no serious a11y violations", async ({ page }) => {
  await page.goto("/login");
  await expectNoSeriousViolations(page);
});

test("dashboard has no serious a11y violations", async ({ page }) => {
  await signIn(page);
  await expectNoSeriousViolations(page);
});

test("findings list has no serious a11y violations", async ({ page }) => {
  await signIn(page);
  await page.goto("/findings");
  await expect(page.getByRole("heading", { name: "Findings" })).toBeVisible();
  await expectNoSeriousViolations(page);
});
