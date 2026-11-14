import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations, signIn, visit } from "./support/auth";
import { E2E_PROPOSED_FOOD, type E2eProject } from "./support/seed";

function proposedFood(): string {
  return E2E_PROPOSED_FOOD[test.info().project.name as E2eProject];
}

/** List links are named by the food, then its reference count ("chicken 3"). */
const CHICKEN = /^chicken\s+\d/;

test.describe("Ingredients", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await visit(page, "/ingredients");
  });

  test("lists every approved food, variants included, keeps proposed ones under needs review, and switches grouping", async ({
    page,
  }) => {
    const list = page.getByRole("region", { name: "Ingredients" });
    await expect(list.getByRole("link", { name: CHICKEN })).toBeVisible();
    await expect(
      list.getByRole("link", { name: /^chicken thigh/ })
    ).toBeVisible();
    // Each browser approves its own proposed food later in the run, so only this project's is checked
    await expect(
      list.getByRole("link", { name: new RegExp(`^${proposedFood()}`) })
    ).toHaveCount(0);

    const views = page.getByRole("navigation", { name: "Ingredient view" });
    await views.getByRole("link", { name: /Needs review/ }).click();
    await expect(page).toHaveURL(/view=unreviewed/);
    await expect(list.getByRole("link", { name: CHICKEN })).toHaveCount(0);

    const grouping = page.getByRole("navigation", { name: "Group by" });
    await grouping.getByRole("link", { name: "Property" }).click();
    await expect(page).toHaveURL(/group=property/);
    await expect(page).toHaveURL(/view=unreviewed/);
    await expect(
      grouping.getByRole("link", { name: "Property" })
    ).toHaveAttribute("aria-current", "page");
  });

  test("approved cards open read-only, list variants by relationship, and show each variant's base", async ({
    page,
  }) => {
    await page
      .getByRole("region", { name: "Ingredients" })
      .getByRole("link", { name: CHICKEN })
      .click();
    const card = page.getByRole("region", { name: "Selected ingredient" });
    await expect(
      card.getByRole("button", { name: "Edit chicken" })
    ).toBeVisible();
    await expect(card.getByRole("textbox")).toHaveCount(0);
    await card
      .getByRole("list", { name: "Parts of chicken" })
      .getByRole("link", { name: "chicken thigh" })
      .click();

    await expect(
      card.getByRole("list", { name: "Base ingredients" })
    ).toHaveText("chicken thigh is part of chicken");
    await expect(card.getByText("Approved", { exact: true })).toBeVisible();
    await expect(
      card.getByRole("link", { name: "Concept details" })
    ).toHaveAttribute("href", /\/concepts\//);

    await card.getByRole("button", { name: "Edit chicken thigh" }).click();
    await expect(
      card.getByLabel("How chicken thigh relates to chicken")
    ).toHaveValue("PART_OF");
    await card
      .getByLabel("Name", { exact: true })
      .fill("chicken thighs on the bone");
    await card.getByRole("button", { name: "Cancel" }).click();
    await expect(card.getByRole("heading", { level: 2 })).toHaveText(
      "chicken thigh, chicken thighs"
    );

    await card
      .getByRole("link", { name: "Recipes with chicken thigh" })
      .click();
    await expect(page).toHaveURL(/\/recipes\?concept=/);
  });

  test("saving a proposed food from its card approves it", async ({ page }) => {
    const food = proposedFood();
    await page
      .getByRole("navigation", { name: "Ingredient view" })
      .getByRole("link", { name: /Needs review/ })
      .click();
    await page
      .getByRole("region", { name: "Ingredients" })
      .getByRole("link", { name: new RegExp(`^${food} \\(needs review\\)`) })
      .click();
    const card = page.getByRole("region", { name: "Selected ingredient" });
    await expect(card.getByLabel("Name", { exact: true })).toHaveValue(food);
    await expect(
      card.getByText("Needs review (saving approves it)")
    ).toBeVisible();

    // "Save and next" swaps in the next card without falling back to the layout's spinner, and the card never jumps out of its list (above the group header), even when the list refresh lands well before the next card loads
    await page.route("**/api/graphql", async (route) => {
      const body: unknown = route.request().postDataJSON();
      const isDetail =
        typeof body === "object" &&
        body !== null &&
        "operationName" in body &&
        body.operationName === "IngredientDetail";
      if (isDetail) await new Promise((resolve) => setTimeout(resolve, 750));
      await route.continue();
    });
    await page.evaluate(() => {
      const flags = window as unknown as {
        sawPageSpinner: boolean;
        sawCardOutsideList: boolean;
      };
      flags.sawPageSpinner = false;
      flags.sawCardOutsideList = false;
      new MutationObserver(() => {
        if (
          document.querySelector('main [role="status"][aria-label="Loading"]')
        )
          flags.sawPageSpinner = true;
        const card = document.querySelector(
          'main [aria-label="Selected ingredient"]'
        );
        if (card && !card.closest("[data-state]"))
          flags.sawCardOutsideList = true;
      }).observe(document.body, { childList: true, subtree: true });
    });
    const currentUrl = page.url();
    await card.getByRole("button", { name: "Save and next" }).click();
    await expect(page).not.toHaveURL(currentUrl);
    await expect(
      page
        .getByRole("region", { name: "Ingredients" })
        .getByRole("link", { name: new RegExp(`^${food} \\(needs review\\)`) })
    ).toHaveCount(0);
    expect(
      await page.evaluate(() => {
        const flags = window as unknown as {
          sawPageSpinner: boolean;
          sawCardOutsideList: boolean;
        };
        return {
          spinner: flags.sawPageSpinner,
          outside: flags.sawCardOutsideList,
        };
      })
    ).toEqual({ spinner: false, outside: false });

    await visit(page, "/ingredients");
    await expect(
      page
        .getByRole("region", { name: "Ingredients" })
        .getByRole("link", { name: new RegExp(`^${food}`) })
    ).toBeVisible();
  });

  test("validates the add-ingredient dialog, adds the food, and links it to an existing base ingredient", async ({
    page,
  }) => {
    const name = `${test.info().project.name} parsnip`;
    const trigger = page.getByRole("button", { name: "Add ingredient" });
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Add ingredient" });
    await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();
    await dialog.getByRole("button", { name: "Add ingredient" }).click();
    await expect(dialog.getByText("Name is required")).toBeVisible();

    await dialog.getByLabel("Name", { exact: true }).fill("turnip");
    await dialog.getByLabel("Plural (optional)").fill("Turnip");
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

    const card = page.getByRole("region", { name: "Selected ingredient" });
    await card.getByRole("button", { name: `Edit ${name}` }).click();
    await card.getByRole("button", { name: "Add a base ingredient" }).click();
    const adder = card.getByRole("group", { name: "New base ingredient" });
    await adder.getByRole("button", { name: "Add base ingredient" }).click();
    await expect(adder.getByRole("alert")).toContainText("Choose how");
    await adder.getByLabel("Relationship").selectOption("IS_A");
    await adder.getByRole("combobox", { name: "Base ingredient" }).fill("appl");
    await adder.getByRole("option", { name: "apple" }).click();
    await adder.getByRole("button", { name: "Add base ingredient" }).click();
    await expect(card.getByLabel(`How ${name} relates to apple`)).toHaveValue(
      "IS_A"
    );
    await card.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      card.getByRole("button", { name: `Edit ${name}` })
    ).toBeVisible();

    await visit(page, "/ingredients");
    const list = page.getByRole("region", { name: "Ingredients" });
    await list.getByRole("link", { name: /^apple\s+\d/ }).click();
    await expect(
      page
        .getByRole("region", { name: "Selected ingredient" })
        .getByRole("list", { name: "Kinds of apple" })
        .getByRole("link", { name })
    ).toBeVisible();
  });

  test("has no WCAG 2.1 AA violations on desktop and mobile, in view and edit mode", async ({
    page,
  }) => {
    await expect(
      page.getByRole("region", { name: "Ingredients" })
    ).toBeVisible();
    await expectNoAccessibilityViolations(page, { include: "main" });
    await page
      .getByRole("region", { name: "Ingredients" })
      .getByRole("link", { name: CHICKEN })
      .click();
    const card = page.getByRole("region", { name: "Selected ingredient" });
    await expect(
      card.getByRole("list", { name: "Parts of chicken" })
    ).toBeVisible();
    await expectNoAccessibilityViolations(page, { include: "main" });
    await card.getByRole("button", { name: "Edit chicken" }).click();
    await expect(card.getByLabel("Name", { exact: true })).toBeVisible();
    await expectNoAccessibilityViolations(page, { include: "main" });
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoAccessibilityViolations(page, { include: "main" });
  });
});
