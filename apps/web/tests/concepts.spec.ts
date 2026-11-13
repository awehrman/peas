import { type Page, expect, test } from "@playwright/test";

import {
  expectNoAccessibilityViolations,
  signIn,
  visit,
  waitForHydration,
} from "./support/auth";
import {
  E2E_CONCEPT_RECIPE,
  E2E_PROPOSED_CONCEPT,
  type E2eProject,
} from "./support/seed";

/** Concept list links are named by the concept, its status badge when not verified, and its counts ("fennel proposed 1 name · 0 mentions"). */
function conceptLink(page: Page, name: string) {
  return page
    .getByRole("main")
    .getByRole("link", { name: new RegExp(`^${name}\\s+(proposed\\s+)?\\d`) });
}

async function openConcept(page: Page, name: string): Promise<void> {
  await visit(page, `/concepts?query=${encodeURIComponent(name)}`);
  await conceptLink(page, name).click();
  await expect(
    page.getByRole("main").getByRole("heading", { name, level: 1 })
  ).toBeVisible();
}

test.describe("Concepts", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("edits tags, classifications, and substitutions on a concept page", async ({
    page,
  }) => {
    const project = test.info().project.name;
    const tag = `${project}-fridge`;
    const category = `${project} dairy case`;
    await openConcept(page, "milk");

    await page.getByLabel("Add a tag").fill(tag);
    await page.getByRole("button", { name: "Add tag" }).click();
    await expect(page.getByRole("list", { name: "Tags" })).toContainText(tag);

    await page.getByLabel("Kind").selectOption("CATEGORY");
    await page.getByLabel("Category name").fill(category);
    await page.getByRole("button", { name: "Save classification" }).click();
    await expect(page.getByText(`Set ${category} to yes`)).toBeVisible();

    await page.getByRole("combobox", { name: "Substitute" }).fill("powdered");
    await page.getByRole("option", { name: "powdered sugar" }).click();
    await page.getByLabel("Ratio (optional)").fill("1:1");
    await page.getByRole("button", { name: "Add substitution" }).click();
    await expect(
      page.getByRole("list", { name: "Substitutions" })
    ).toContainText("powdered sugar(1:1)");

    await page.reload();
    await waitForHydration(page);
    await expect(page.getByRole("list", { name: "Tags" })).toContainText(tag);
    await page.getByRole("button", { name: "Remove powdered sugar" }).click();
    await expect(page.getByText("No substitutions.")).toBeVisible();
    await page.getByRole("button", { name: `Remove ${category}` }).click();
    await expect(page.getByText(`Removed ${category}`)).toBeVisible();
    await page.getByRole("button", { name: `Remove ${tag}` }).click();
    await expect(page.getByText("No tags.")).toBeVisible();
  });

  test("lists recipes for a concept, including more specific concepts", async ({
    page,
  }) => {
    await openConcept(page, "chicken");
    await page.getByRole("link", { name: "Recipes with chicken" }).click();
    await expect(page).toHaveURL(/\/recipes\?concept=/);
    await expect(
      page.getByRole("link", { name: E2E_CONCEPT_RECIPE.title })
    ).toBeVisible();
    await expect(page.getByText(/1 recipe with chicken/)).toBeVisible();

    await page
      .getByRole("button", { name: "Stop filtering by chicken" })
      .click();
    await expect(page).not.toHaveURL(/concept=/);
  });

  test("approving a proposed concept puts it on the ingredients page", async ({
    page,
  }) => {
    const food = E2E_PROPOSED_CONCEPT[test.info().project.name as E2eProject];
    await openConcept(page, food);
    await page.getByRole("button", { name: "Approve" }).click();
    const dialog = page.getByRole("dialog", { name: `Approve ${food}?` });
    await dialog.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText(`Approved ${food}`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);

    await visit(page, "/ingredients");
    await expect(
      page
        .getByRole("region", { name: "Ingredients" })
        .getByRole("link", { name: new RegExp(`^${food}`) })
    ).toBeVisible();
  });

  test("moves between the Knowledge tabs and searches the lexicon", async ({
    page,
  }) => {
    await visit(page, "/concepts");
    const tabs = page.getByRole("navigation", { name: "Knowledge" });
    await expect(tabs.getByRole("link", { name: "Concepts" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await tabs.getByRole("link", { name: "Lexicon" }).click();
    await expect(page).toHaveURL(/\/lexicon$/);
    await expect(
      page.getByRole("heading", { name: "Lexicon", level: 1 })
    ).toBeVisible();

    await page.getByLabel("Search the lexicon").fill("chicken thigh");
    await page.getByLabel("Search the lexicon").press("Enter");
    await expect(page).toHaveURL(/query=chicken/);
    const plural = page.getByRole("row", { name: /chicken thighs/ });
    await expect(plural).toContainText("food (plural)");
    await plural.getByRole("link", { name: "chicken thigh" }).click();
    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { name: "chicken thigh", level: 1 })
    ).toBeVisible();

    await tabs.getByRole("link", { name: "Review queue" }).click();
    await expect(page).toHaveURL(/\/teach$/);
  });

  test("concepts list, concept page, and lexicon have no WCAG 2.1 AA violations", async ({
    page,
  }) => {
    await visit(page, "/concepts");
    await expect(conceptLink(page, "milk")).toBeVisible();
    await expectNoAccessibilityViolations(page, { include: "main" });
    await openConcept(page, "milk");
    await expectNoAccessibilityViolations(page, { include: "main" });
    await visit(page, "/lexicon?role=FOOD");
    await expect(
      page.getByRole("table", { name: "Lexicon entries" })
    ).toBeVisible();
    await expectNoAccessibilityViolations(page, { include: "main" });
  });
});
