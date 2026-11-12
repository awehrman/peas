import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations, signIn, visit } from "./support/auth";

test.describe("Ingredients", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await visit(page, "/ingredients");
  });

  test("switches between all and needs-review views and grouping", async ({
    page,
  }) => {
    const views = page.getByRole("navigation", { name: "Ingredient view" });
    await views.getByRole("link", { name: /Needs review/ }).click();
    await expect(page).toHaveURL(/view=unreviewed/);
    await expect(
      page
        .getByRole("region", { name: "Ingredients" })
        .getByRole("link", { name: "garlic" })
    ).toHaveCount(0);

    const grouping = page.getByRole("navigation", { name: "Group by" });
    await grouping.getByRole("link", { name: "Property" }).click();
    await expect(page).toHaveURL(/group=property/);
    await expect(page).toHaveURL(/view=unreviewed/);
    await expect(
      grouping.getByRole("link", { name: "Property" })
    ).toHaveAttribute("aria-current", "page");
  });

  test("validates the add-ingredient dialog, returns focus, and adds the ingredient to the list", async ({
    page,
  }) => {
    const name = `${test.info().project.name} leek`;
    const trigger = page.getByRole("button", { name: "Add ingredient" });
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Add ingredient" });
    await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();
    await dialog.getByRole("button", { name: "Add ingredient" }).click();
    await expect(dialog.getByText("Name is required")).toBeVisible();

    await dialog.getByLabel("Name", { exact: true }).fill("shallot");
    await dialog.getByLabel("Plural (optional)").fill("Shallot");
    await expect(
      dialog.getByText("Plural must be different from the name")
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await dialog.getByLabel("Name", { exact: true }).fill(name);
    await dialog.getByRole("button", { name: "Add ingredient" }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/id=/);
    await expect(
      page
        .getByRole("region", { name: "Ingredients" })
        .getByRole("link", { name })
    ).toBeVisible();
  });

  test("saving an ingredient marks it reviewed and updates the needs-review count", async ({
    page,
  }) => {
    const ingredient =
      test.info().project.name === "webkit" ? "shallot" : "lemon";
    const views = page.getByRole("navigation", { name: "Ingredient view" });
    const needsReview = views.getByRole("link", { name: /Needs review/ });
    const before = Number((await needsReview.innerText()).match(/\d+/)?.[0]);

    await page
      .getByRole("region", { name: "Ingredients" })
      .getByRole("link", {
        name: new RegExp(`^${ingredient} \\(needs review\\)`),
      })
      .click();
    await expect(page).toHaveURL(/id=/);
    const card = page.getByRole("region", { name: "Selected ingredient" });
    await expect(card.getByLabel("Name", { exact: true })).toHaveValue(
      ingredient
    );
    await expect(card.getByRole("group", { name: "Properties" })).toBeVisible();

    await card.getByRole("button", { name: "Save", exact: true }).click();
    await expect(needsReview).toContainText(`(${before - 1})`);
    await expect(card.getByText("Reviewed", { exact: true })).toBeVisible();
  });

  test("has no WCAG 2.1 AA violations on desktop and mobile", async ({
    page,
  }) => {
    await expectNoAccessibilityViolations(page, { include: "main" });
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoAccessibilityViolations(page, { include: "main" });
  });
});
