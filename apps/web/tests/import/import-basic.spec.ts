import { expect, test } from "@playwright/test";

test.describe("Import Page Basic Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/import");
  });

  test("should load import page successfully", async ({ page }) => {
    // Check that the page loads
    await expect(page.locator("body")).toBeVisible();

    // Check for any heading on the page (more flexible)
    const headings = page.locator("h1, h2, h3, h4, h5, h6");
    const headingCount = await headings.count();

    if (headingCount > 0) {
      await expect(headings.first()).toBeVisible();
    }

    // Check that the import component container is present
    const importContainer = page.locator(".container");
    await expect(importContainer).toBeVisible();
  });

  test("should have file upload functionality", async ({ page }) => {
    // Look for file input elements
    const fileInputs = page.locator('input[type="file"]');
    const fileInputCount = await fileInputs.count();

    // Should have at least one file input
    expect(fileInputCount).toBeGreaterThan(0);

    // File input should be visible or accessible
    const firstFileInput = fileInputs.first();
    await expect(firstFileInput).toBeAttached();
  });

  test("should be responsive", async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator(".container")).toBeVisible();

    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator(".container")).toBeVisible();
  });

  test("should have proper page structure", async ({ page }) => {
    // Check for main container
    const container = page.locator(".container");
    await expect(container).toBeVisible();

    // Check for grid layout
    const grid = page.locator(".grid");
    await expect(grid).toBeVisible();

    // Check for card with file upload
    const card = page.locator(".bg-card");
    await expect(card).toBeVisible();
  });
});
