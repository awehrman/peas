import { expect, test } from "@playwright/test";

test.describe("Import Page Smoke Tests", () => {
  test("should load import page without errors", async ({ page }) => {
    // Navigate to import page
    const response = await page.goto("/import");

    // Check that the page loaded successfully (status 200)
    expect(response?.status()).toBe(200);

    // Check that the page body is visible
    await expect(page.locator("body")).toBeVisible();

    // Check that there are no obvious JavaScript errors
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test("should have basic page structure", async ({ page }) => {
    await page.goto("/import");

    // Check for basic HTML structure
    await expect(page.locator("html")).toBeVisible();
    await expect(page.locator("body")).toBeVisible();

    // Check that React has rendered (there should be some content)
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });

  test("should not have console errors", async ({ page }) => {
    const consoleErrors: string[] = [];

    // Listen for console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/import");

    // Wait a bit for any async operations
    await page.waitForTimeout(2000);

    // Should not have critical console errors
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes("favicon") && // Ignore favicon errors
        !error.includes("404") && // Ignore 404s for missing resources
        !error.includes("WebSocket") // Ignore WebSocket connection errors in test
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
