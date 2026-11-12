import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations } from "../helpers/a11y";
import { signIn, skipWithoutCredentials } from "../helpers/auth";

test.describe("Ingredients", () => {
  skipWithoutCredentials();

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/ingredients");
  });

  test("switches between all and needs-review views and grouping", async ({ page }) => {
    const views = page.getByRole("navigation", { name: "Ingredient view" });
    await views.getByRole("link", { name: /Needs review/ }).click();
    await expect(page).toHaveURL(/view=unreviewed/);

    const grouping = page.getByRole("navigation", { name: "Group by" });
    await grouping.getByRole("link", { name: "Property" }).click();
    await expect(page).toHaveURL(/group=property/);
    await expect(page).toHaveURL(/view=unreviewed/);
    await expect(grouping.getByRole("link", { name: "Property" })).toHaveAttribute("aria-current", "page");
  });

  test("validates the add-ingredient dialog and returns focus when closed", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Add ingredient" });
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Add ingredient" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();

    await dialog.getByRole("button", { name: "Add ingredient" }).click();
    await expect(dialog.getByText("Name is required")).toBeVisible();

    await dialog.getByLabel("Name", { exact: true }).fill("shallot");
    await dialog.getByLabel("Plural (optional)").fill("Shallot");
    await expect(dialog.getByText("Plural must be different from the name")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("selecting an ingredient opens its editable card", async ({ page }) => {
    const firstIngredient = page
      .getByRole("region", { name: "Ingredients" })
      .getByRole("link")
      .first();
    test.skip((await firstIngredient.count()) === 0, "No ingredients in this database");

    await firstIngredient.click();

    await expect(page).toHaveURL(/id=/);
    const card = page.getByRole("region", { name: "Selected ingredient" });
    await expect(card.getByLabel("Name", { exact: true })).toBeVisible();
    await expect(card.getByRole("group", { name: "Properties" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  test("has no WCAG 2.1 AA violations on desktop and mobile", async ({ page }) => {
    await expectNoAccessibilityViolations(page, { include: "main" });

    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoAccessibilityViolations(page, { include: "main" });
  });
});
