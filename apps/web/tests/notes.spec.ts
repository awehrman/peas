import { expect, test } from "@playwright/test";

import {
  expectNoAccessibilityViolations,
  signIn,
  visit,
  waitForHydration,
} from "./support/auth";
import { E2E_NOTE } from "./support/seed";

test.describe("Notes slice", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("lists notes server-side and filters by status without a full reload", async ({
    page,
  }) => {
    await visit(page, "/notes");
    await expect(
      page.getByRole("link", { name: E2E_NOTE.title })
    ).toBeVisible();

    await page.getByRole("link", { name: "Failed" }).click();
    await expect(page).toHaveURL(/status=FAILED/);
    await expect(page.getByRole("link", { name: "Failed" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(page.getByRole("link", { name: E2E_NOTE.title })).toHaveCount(
      0
    );

    await page.getByRole("link", { name: "All", exact: true }).click();
    await expect(
      page.getByRole("link", { name: E2E_NOTE.title })
    ).toBeVisible();
  });

  test("opens a note and records a line review that survives a reload", async ({
    page,
  }) => {
    await visit(page, "/notes");
    await page.getByRole("link", { name: E2E_NOTE.title }).click();
    await expect(
      page.getByRole("heading", { name: E2E_NOTE.title, level: 1 })
    ).toBeVisible();

    // Each browser project reviews its own line; the database is reseeded once per run.
    const line = E2E_NOTE.lines[test.info().project.name === "webkit" ? 1 : 0];
    // Highlighted lines add screen-reader role labels between words, so find the row by its review button
    const rowOf = () =>
      page.getByRole("listitem").filter({
        has: page.getByRole("button", {
          name: `Mark "${line}" as parsed correctly`,
        }),
      });
    const row = rowOf();
    await expect(row).toContainText("Not reviewed");

    await page
      .getByRole("button", { name: `Mark "${line}" as parsed correctly` })
      .click();
    await expect(row).toContainText("Marked correct");
    await expect(row).not.toContainText("Something went wrong");

    await page.reload();
    await waitForHydration(page);
    await expect(rowOf()).toContainText("Marked correct");
  });

  test("an imported line shows its resolved concept from v2 mentions", async ({
    page,
  }) => {
    await visit(page, "/notes");
    await page.getByRole("link", { name: E2E_NOTE.title }).click();
    const reading = page.getByRole("list", {
      name: 'Peas reading of "1 cup milk"',
    });
    await expect(reading).toContainText("milk");
    await expect(reading).toContainText("Resolved");
    await expect(
      page.getByRole("listitem").filter({ hasText: "1 cup milk" }).first()
    ).toContainText("milk (food)");
  });

  test("notes list and note detail have no WCAG 2.1 AA violations", async ({
    page,
  }) => {
    await visit(page, "/notes");
    await expect(
      page.getByRole("link", { name: E2E_NOTE.title })
    ).toBeVisible();
    await expectNoAccessibilityViolations(page);

    await page.getByRole("link", { name: E2E_NOTE.title }).click();
    await expect(
      page.getByRole("heading", { name: E2E_NOTE.title, level: 1 })
    ).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });
});
