import { type Page, expect, test } from "@playwright/test";

import {
  expectNoAccessibilityViolations,
  signIn,
  visit,
  waitForHydration,
} from "./support/auth";
import {
  E2E_CONCEPT_RECIPE,
  E2E_LEXICON,
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

  test("edits tags, classifications, and substitutions from the concept card's edit mode", async ({
    page,
  }) => {
    const project = test.info().project.name;
    const tag = `${project}-fridge`;
    const category = `${project} dairy case`;
    await openConcept(page, "milk");

    await page.getByRole("button", { name: "Edit milk" }).click();
    let form = page.getByRole("form", { name: "Edit milk" });
    await form.getByRole("button", { name: "Add a tag" }).click();
    await form.getByRole("textbox", { name: "Tags" }).fill(tag);
    await form.getByRole("textbox", { name: "Tags" }).press("Enter");

    await form.getByRole("button", { name: "Add a classification" }).click();
    await form
      .getByRole("combobox", { name: "Kind of classification" })
      .selectOption("CATEGORY");
    await form
      .getByRole("textbox", { name: "Classification name" })
      .fill(category);
    await form.getByRole("button", { name: "Add classification" }).click();

    await form.getByRole("button", { name: "Add a substitution" }).click();
    await form.getByRole("combobox", { name: "Substitute" }).fill("powdered");
    await page.getByRole("option", { name: "powdered sugar" }).click();
    await form
      .getByRole("textbox", { name: "Ratio for powdered sugar" })
      .fill("1:1");
    await form.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("status")).toHaveText("Saved");
    await expect(page.getByRole("form")).toHaveCount(0);
    await page.reload();
    await waitForHydration(page);
    await expect(page.getByRole("list", { name: "Tags" })).toContainText(tag);
    await expect(
      page.getByRole("list", { name: "Substitutions" })
    ).toContainText("powdered sugar (1:1)");
    await expect(page.getByText(category, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Edit milk" }).click();
    form = page.getByRole("form", { name: "Edit milk" });
    await form
      .getByRole("button", { name: "Remove the substitute powdered sugar" })
      .click();
    await form.getByRole("button", { name: `Remove ${category}` }).click();
    await form.getByRole("button", { name: `Remove ${tag}` }).click();
    await form.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("No substitutions.")).toBeVisible();
    await expect(page.getByText("No tags.")).toBeVisible();
  });

  test("Cancel leaves a concept unchanged", async ({ page }) => {
    await openConcept(page, "apple");
    await page.getByRole("button", { name: "Edit apple" }).click();
    const form = page.getByRole("form", { name: "Edit apple" });
    await form.getByLabel("Main name").fill("pomme");
    await form.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("main").getByRole("heading", { name: "apple", level: 1 })
    ).toBeVisible();
    await page.getByRole("button", { name: "Edit apple" }).click();
    await expect(
      page.getByRole("form", { name: "Edit apple" }).getByLabel("Main name")
    ).toHaveValue("apple");
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

  test("adds a lexicon entry and retires it, confirming each time the stored lines change", async ({
    page,
  }) => {
    const { phrase } = E2E_LEXICON[test.info().project.name as E2eProject];
    await visit(page, "/lexicon");
    await page.getByRole("button", { name: "Add entry" }).click();
    const form = page.getByRole("form", { name: "New lexicon entry" });
    await form.getByRole("textbox", { name: "Text" }).fill(phrase);
    await form.getByRole("combobox", { name: "Food" }).fill("milk");
    await page.getByRole("option", { name: "milk", exact: true }).click();
    await form.getByRole("button", { name: "Add entry" }).click();

    let dialog = page.getByRole("dialog", {
      name: /This changes how 1 mention read/,
    });
    await expect(dialog.getByTestId("impact-summary")).toContainText(
      "1 mention would change"
    );
    await expect(dialog).toContainText(`1 cup ${phrase}`);
    await dialog.getByRole("button", { name: "Save and update lines" }).click();
    await expect(page.getByRole("status")).toContainText(`${phrase} is milk`);

    await page.getByLabel("Search the lexicon").fill(phrase);
    await page.getByLabel("Search the lexicon").press("Enter");
    await page
      .getByRole("button", { name: `Edit ${phrase} (food)`, exact: true })
      .click();
    const edit = page.getByRole("form", { name: `Edit “${phrase}”` });
    await edit
      .getByRole("combobox", { name: "Status" })
      .selectOption("DEPRECATED");
    await edit.getByRole("button", { name: "Save" }).click();
    dialog = page.getByRole("dialog", {
      name: /This changes how 1 mention read/,
    });
    await dialog.getByRole("button", { name: "Save and update lines" }).click();
    await expect(page.getByRole("status")).toHaveText(`Retired “${phrase}”`);

    await page.getByRole("link", { name: "Show retired" }).click();
    await expect(
      page.getByRole("row", { name: new RegExp(`^${phrase} food \\(alias\\)`) })
    ).toContainText("retired");
  });

  test("the glossary walks through a line and defines the terms, with no WCAG 2.1 AA violations", async ({
    page,
  }) => {
    await visit(page, "/teach");
    await page
      .getByRole("navigation", { name: "Knowledge" })
      .getByRole("link", { name: "Glossary" })
      .click();
    await expect(page).toHaveURL(/\/teach\/glossary$/);
    await expect(
      page.getByRole("heading", { name: "Glossary", level: 1 })
    ).toBeVisible();
    await expect(
      page
        .getByRole("list", { name: "How one line is read" })
        .getByRole("listitem")
        .filter({ has: page.getByRole("heading", { level: 3 }) })
    ).toHaveCount(7);
    await expect(page.getByRole("region", { name: "Knowledge" })).toContainText(
      "Lexicon entry"
    );
    await expectNoAccessibilityViolations(page, { include: "main" });
  });

  test("concepts list, concept page, and lexicon have no WCAG 2.1 AA violations", async ({
    page,
  }) => {
    await visit(page, "/concepts");
    await expect(conceptLink(page, "milk")).toBeVisible();
    await expectNoAccessibilityViolations(page, { include: "main" });
    await openConcept(page, "milk");
    await expectNoAccessibilityViolations(page, { include: "main" });
    await page.getByRole("button", { name: "Edit milk" }).click();
    await expect(page.getByRole("form", { name: "Edit milk" })).toBeVisible();
    await expectNoAccessibilityViolations(page, { include: "main" });
    await visit(page, "/lexicon?role=FOOD");
    await expect(
      page.getByRole("table", { name: "Lexicon entries" })
    ).toBeVisible();
    await expectNoAccessibilityViolations(page, { include: "main" });
    await page
      .getByRole("button", { name: "Edit chicken thighs (food)", exact: true })
      .click();
    await expect(
      page.getByRole("form", { name: "Edit “chicken thighs”" })
    ).toBeVisible();
    await expectNoAccessibilityViolations(page, { include: "main" });
  });
});
