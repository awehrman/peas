import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations, signIn, visit } from "./support/auth";

test.describe("Import page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("shows the import section with folder and file pickers and the current stats", async ({
    page,
  }) => {
    await visit(page, "/import");
    const importSection = page.getByRole("region", { name: "Import notes" });

    await expect(
      page.getByRole("heading", { level: 1, name: "Import" })
    ).toBeVisible();
    await expect(
      importSection.getByRole("button", { name: "Choose directory" })
    ).toBeVisible();
    await expect(
      importSection.getByRole("button", { name: "Choose files" })
    ).toBeVisible();
    await expect(page.locator('input[type="file"]').first()).toBeAttached();
    await expect(
      page.getByRole("region", { name: "Import activity" })
    ).toHaveCount(0);
  });

  test("keeps the import section usable on mobile and desktop", async ({
    page,
  }) => {
    await visit(page, "/import");
    const importSection = page.getByRole("region", { name: "Import notes" });

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(importSection).toBeVisible();
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(importSection).toBeVisible();
  });

  test("loads without application errors in the console", async ({ page }) => {
    // Leaving the dashboard cancels its in-flight requests, which WebKit reports as console errors from that page.
    await page.goto("about:blank");
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await visit(page, "/import");
    await expect(
      page.getByRole("region", { name: "Import notes" })
    ).toBeVisible();

    // The queue service is not part of the e2e run, so its websocket may fail to connect
    const applicationErrors = errors.filter(
      (error) =>
        !/websocket|ERR_CONNECTION_REFUSED|Failed to load resource/i.test(error)
    );
    expect(applicationErrors).toEqual([]);
  });

  test("has no WCAG 2.1 AA violations", async ({ page }) => {
    await visit(page, "/import");
    await expectNoAccessibilityViolations(page, { include: "main" });
  });
});
