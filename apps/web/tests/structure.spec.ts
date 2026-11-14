import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations, signIn, visit } from "./support/auth";
import { E2E_STRUCTURE_NOTES, type E2eProject } from "./support/seed";

test.describe("Structure review", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("splits a heading off a step, shows it on the note, and undoes it", async ({
    page,
  }) => {
    const fixture = E2E_STRUCTURE_NOTES[test.info().project.name as E2eProject];
    await visit(page, "/teach/structure");
    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { level: 1, name: "Structure" })
    ).toBeVisible();
    const card = main.getByRole("article", { name: fixture.title });
    await expect(card).toContainText(
      "Filed as step; looks like heading + step"
    );
    await expect(card).toContainText(
      `“${fixture.heading}” then “${fixture.step}”`
    );
    await expectNoAccessibilityViolations(page);

    await card.getByRole("button", { name: "Approve" }).click();
    await expect(card).toHaveCount(0);

    await visit(page, "/teach/structure?status=DECIDED");
    const decided = main.getByRole("article", { name: fixture.title });
    await expect(decided).toContainText("Filed as heading + step by e2e");

    await decided.getByRole("link", { name: fixture.title }).click();
    const note = page.getByRole("main");
    await expect(
      note.getByRole("heading", { level: 3, name: fixture.heading })
    ).toBeVisible();
    await expect(note.getByText(fixture.step, { exact: true })).toBeVisible();

    await visit(page, "/teach/structure?status=DECIDED");
    await main
      .getByRole("article", { name: fixture.title })
      .getByRole("button", { name: "Undo" })
      .click();
    await expect(
      main.getByRole("article", { name: fixture.title })
    ).toHaveCount(0);
    await visit(page, "/teach/structure");
    await expect(
      main.getByRole("article", { name: fixture.title })
    ).toBeVisible();
  });
});
