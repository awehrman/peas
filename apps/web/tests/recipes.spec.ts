import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations, signIn, visit } from "./support/auth";
import { E2E_RECIPE } from "./support/seed";

test.describe("Recipes", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await visit(page, "/recipes");
  });

  test("searches recipes and keeps the query in the URL", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Search recipes" }).fill("lemon");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/q=lemon/);
    await expect(
      page.getByRole("link", { name: E2E_RECIPE.title })
    ).toBeVisible();

    // The search form remounts with the new query once results arrive, so retry if typing raced that remount
    await expect(async () => {
      await page
        .getByRole("searchbox", { name: "Search recipes" })
        .fill("zzz-no-match");
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await expect(page).toHaveURL(/q=zzz-no-match/, { timeout: 2000 });
    }).toPass();
    await expect(page.getByText("0 recipes")).toBeVisible();
  });

  test("validates the edit dialog and cancels without saving", async ({
    page,
  }) => {
    await page.getByRole("link", { name: E2E_RECIPE.title }).click();
    await expect(page).toHaveURL(/\/recipes\/.+/);
    await expect(
      page.getByRole("heading", { name: "Ingredients" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit recipe" });
    await dialog.getByLabel("Title").fill("");
    await expect(dialog.getByText("Title is required")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("heading", { level: 1, name: E2E_RECIPE.title })
    ).toBeVisible();
  });

  test("saving tags updates the open recipe and the recipes list filters", async ({
    page,
  }) => {
    const tag = `${test.info().project.name}-favourite`;
    await page.getByRole("link", { name: E2E_RECIPE.title }).click();
    await page.getByRole("button", { name: "Edit" }).click();

    const dialog = page.getByRole("dialog", { name: "Edit recipe" });
    const tagInput = dialog.getByRole("textbox", { name: "Tags" });
    await tagInput.fill(tag);
    await tagInput.press("Enter");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("main").getByText(tag)).toBeVisible();

    await visit(page, `/recipes?tag=${tag}`);
    await expect(
      page.getByRole("link", { name: E2E_RECIPE.title })
    ).toBeVisible();
  });

  test("has no WCAG 2.1 AA violations", async ({ page }) => {
    await expectNoAccessibilityViolations(page, { include: "main" });
    await page.getByRole("link", { name: E2E_RECIPE.title }).click();
    await expect(
      page.getByRole("heading", { name: "Ingredients" })
    ).toBeVisible();
    await expectNoAccessibilityViolations(page, { include: "main" });
  });
});
