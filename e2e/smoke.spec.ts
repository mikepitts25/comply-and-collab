import { test, expect } from "@playwright/test";

// Core user journey against seeded demo data: sign in, see posture,
// drill into findings, and open a finding with its correlated controls.

test("analyst signs in and reaches the dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("analyst@demo.mil");
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByRole("heading", { name: "Compliance Dashboard" })).toBeVisible();
  await expect(page.getByText("Open Findings", { exact: false }).first()).toBeVisible();
});

test("findings list shows correlated controls and finding detail opens", async ({ page }) => {
  // Sign in
  await page.goto("/login");
  await page.getByLabel("Email").fill("analyst@demo.mil");
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("heading", { name: "Compliance Dashboard" })).toBeVisible();

  // Findings list renders rows from the seeded scans
  await page.goto("/findings");
  await expect(page.getByRole("heading", { name: "Findings" })).toBeVisible();
  const firstFinding = page.locator("tbody tr").first();
  await expect(firstFinding).toBeVisible();

  // Drill into the first finding: title + mapped controls card
  await firstFinding.getByRole("link").first().click();
  await expect(page.getByText("Mapped 800-53 controls")).toBeVisible();
  await expect(page.getByText("Deviations")).toBeVisible();
});

test("wrong password is rejected and rate limiting stays quiet for one attempt", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("analyst@demo.mil");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/invalid credentials/i)).toBeVisible();
});
