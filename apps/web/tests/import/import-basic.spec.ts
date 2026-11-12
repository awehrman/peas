import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations } from "../helpers/a11y";
import { signIn, skipWithoutCredentials } from "../helpers/auth";

test.describe("Import page", () => {
  skipWithoutCredentials();

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/import");
  });

  test("shows the import section with folder and file pickers", async ({ page }) => {
    const importSection = page.getByRole("region", { name: "Import notes" });

    await expect(page.getByRole("heading", { level: 1, name: "Import" })).toBeVisible();
    await expect(importSection.getByRole("button", { name: "Choose directory" })).toBeVisible();
    await expect(importSection.getByRole("button", { name: "Choose files" })).toBeVisible();
    await expect(page.locator('input[type="file"]').first()).toBeAttached();
  });

  test("keeps the import section usable on mobile and desktop", async ({ page }) => {
    const importSection = page.getByRole("region", { name: "Import notes" });

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(importSection).toBeVisible();

    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(importSection).toBeVisible();
  });

  test("hides the activity section until something is imported", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Import activity" })).toHaveCount(0);
  });

  test("has no WCAG 2.1 AA violations", async ({ page }) => {
    await expectNoAccessibilityViolations(page, { include: "main" });
  });
});
