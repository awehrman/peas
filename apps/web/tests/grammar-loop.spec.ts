import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations, signIn, visit } from "./support/auth";
import { E2E_STRUCTURAL, type E2eProject } from "./support/seed";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("Grammar loop", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("a structural pattern's card exports fixtures and marks its lines as noise", async ({
    page,
  }) => {
    const { line, signature } =
      E2E_STRUCTURAL[test.info().project.name as E2eProject];
    await visit(page, "/teach?type=STRUCTURAL_PATTERN");
    await page
      .getByRole("main")
      .getByRole("link", {
        name: new RegExp(`^${escapeRegExp(signature)}\\s*Structure`),
      })
      .click();

    await expect(
      page.getByRole("heading", { name: signature, level: 1 })
    ).toBeVisible();
    await expect(page.getByLabel("Export as fixtures")).toContainText(
      `"input": "${line}"`
    );
    await expect(page.getByRole("button", { name: /^Apply/ })).toHaveCount(0);
    await expectNoAccessibilityViolations(page, { include: "main" });

    await page.getByRole("button", { name: "Mark as noise" }).click();
    const dialog = page.getByRole("dialog", {
      name: `Mark “${signature}” as noise?`,
    });
    await dialog.getByRole("button", { name: "Mark as noise" }).click();
    await expect(
      page.getByText(`Marked “${signature}” as noise; 1 line set aside`)
    ).toBeVisible();
  });

  test("the Health tab charts the corpus, takes a snapshot, and passes axe", async ({
    page,
  }) => {
    await visit(page, "/teach/health");
    await expect(
      page
        .getByRole("navigation", { name: "Knowledge" })
        .getByRole("link", { name: "Health" })
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("heading", { name: "Corpus health", level: 1 })
    ).toBeVisible();
    await expect(
      page.getByRole("table", { name: "Mentions by parser version" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Take snapshot" }).click();
    await expect(page.getByText("Snapshot taken")).toBeVisible();
    await expect(
      page.getByRole("table", { name: "Corpus health snapshots" })
    ).toContainText("manual");
    await expect(
      page.getByRole("img", { name: /Resolved share of mentions/ })
    ).toBeVisible();

    await expectNoAccessibilityViolations(page, { include: "main" });
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoAccessibilityViolations(page, { include: "main" });
  });
});
