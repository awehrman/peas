import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations } from "../helpers/a11y";
import { signIn, skipWithoutCredentials } from "../helpers/auth";

test.describe("Recipes", () => {
  skipWithoutCredentials();

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/recipes");
  });

  test("searches recipes and keeps the query in the URL", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Search recipes" }).fill("chili");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    await expect(page).toHaveURL(/q=chili/);
    await expect(page.getByText(/\d+ recipes?/)).toBeVisible();
  });

  test("opens a recipe and validates the edit dialog", async ({ page }) => {
    const firstRecipe = page
      .getByRole("main")
      .getByRole("heading", { level: 2 })
      .getByRole("link")
      .first();
    test.skip((await firstRecipe.count()) === 0, "No recipes in this database");

    await firstRecipe.click();
    await expect(page).toHaveURL(/\/recipes\/.+/);
    await expect(page.getByRole("heading", { name: "Ingredients" })).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit recipe" });
    await dialog.getByLabel("Title").fill("");
    await expect(dialog.getByText("Title is required")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });

  test("has no WCAG 2.1 AA violations", async ({ page }) => {
    await expectNoAccessibilityViolations(page, { include: "main" });
  });
});
