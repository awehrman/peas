import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations } from "../helpers/a11y";
import { signIn, skipWithoutCredentials } from "../helpers/auth";

test.describe("Notes", () => {
  skipWithoutCredentials();

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/notes");
  });

  test("filters notes by status through the URL", async ({ page }) => {
    const statusNav = page.getByRole("navigation", { name: "Filter notes by status" });
    await expect(statusNav.getByRole("link", { name: "All" })).toHaveAttribute("aria-current", "page");

    await statusNav.getByRole("link", { name: "Failed" }).click();

    await expect(page).toHaveURL(/status=FAILED/);
    await expect(statusNav.getByRole("link", { name: "Failed" })).toHaveAttribute("aria-current", "page");
  });

  test("searches note titles and keeps the query in the URL", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Search titles" }).fill("lemon");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    await expect(page).toHaveURL(/q=lemon/);
    await expect(page.getByRole("searchbox", { name: "Search titles" })).toHaveValue("lemon");
  });

  test("opens a note and shows its parsed ingredients and instructions", async ({ page }) => {
    const firstNote = page.getByRole("table").getByRole("link").first();
    test.skip((await firstNote.count()) === 0, "No imported notes in this database");

    await firstNote.click();

    await expect(page).toHaveURL(/\/notes\/.+/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ingredients" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Instructions" })).toBeVisible();
    await expect(page.getByRole("link", { name: "All notes" })).toBeVisible();
  });

  test("note list and detail pages have no WCAG 2.1 AA violations", async ({ page }) => {
    await expectNoAccessibilityViolations(page, { include: "main" });

    const firstNote = page.getByRole("table").getByRole("link").first();
    if ((await firstNote.count()) > 0) {
      await firstNote.click();
      await expect(page.getByRole("heading", { name: "Ingredients" })).toBeVisible();
      await expectNoAccessibilityViolations(page, { include: "main" });
    }
  });
});
