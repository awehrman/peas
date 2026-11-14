import { type Page, expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations, signIn, visit } from "./support/auth";
import { E2E_DUPLICATES, type E2eProject } from "./support/seed";

async function openOwnDuplicate(page: Page, project: E2eProject): Promise<void> {
  await visit(page, "/import?view=review&review=exact");
  const title = E2E_DUPLICATES[project].title;
  await page.getByRole("link", { name: new RegExp(`^${title} vs\\. ${title}`) }).click();
  await expect(page.getByRole("heading", { name: "Possible duplicate", level: 1 })).toBeVisible();
}

test.describe("Import review", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("lists duplicates by kind with counts", async ({ page }) => {
    await visit(page, "/import?view=review");
    const sections = page.getByRole("navigation", { name: "Review sections" });
    await expect(sections.getByRole("link", { name: /Exact duplicates \(\d+\)/ })).toHaveAttribute("aria-current", "page");
    await expect(sections.getByRole("link", { name: /Book matches/ })).toBeVisible();
    await expect(sections.getByRole("link", { name: /Failed source checks/ })).toBeVisible();
  });

  test("previews a decision, applies it, and undoes it", async ({ page }, testInfo) => {
    const project = testInfo.project.name as E2eProject;
    await openOwnDuplicate(page, project);

    // The default choice keeps the existing note; the preview says what will happen before anything is written
    await expect(page.getByText(/nothing is deleted/).first()).toBeVisible();
    await page.getByLabel(/Keep both/).check();
    await expect(page.getByText(/won't be flagged again/).first()).toBeVisible();
    await expect(page.getByRole("checkbox")).toBeDisabled();

    await page.getByLabel(/Keep the existing note/).check();
    await page.getByRole("button", { name: "Apply decision" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/archive/)).toBeVisible();
    await dialog.getByRole("button", { name: "Apply" }).click();

    await expect(page.getByText(/Keep the existing note, sources merged/)).toBeVisible();

    await page.getByRole("button", { name: "Undo decision" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Undo" }).click();
    await expect(page.getByRole("button", { name: "Apply decision" })).toBeVisible();
  });

  test("review pages have no WCAG 2.1 AA violations", async ({ page }, testInfo) => {
    const project = testInfo.project.name as E2eProject;
    await visit(page, "/import?view=review");
    await expectNoAccessibilityViolations(page);

    await openOwnDuplicate(page, project);
    await expect(page.getByText(/This will:/)).toBeVisible();
    await expectNoAccessibilityViolations(page);

    await visit(page, "/recipes/categories");
    await expect(page.getByRole("heading", { name: "Categories", level: 1 })).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });
});
