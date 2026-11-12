import { type Page, expect, test } from "@playwright/test";

import { signIn, visit } from "./support/auth";
import { E2E_TEACH, type E2eProject, rerunBackfill } from "./support/seed";

function fixture(): (typeof E2E_TEACH.perProject)[E2eProject] {
  return E2E_TEACH.perProject[test.info().project.name as E2eProject];
}

async function openTeachNote(page: Page): Promise<void> {
  await visit(page, `/notes?q=${encodeURIComponent(E2E_TEACH.noteTitle)}`);
  await page
    .getByRole("link", { name: new RegExp(E2E_TEACH.noteTitle) })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: E2E_TEACH.noteTitle, level: 1 })
  ).toBeVisible();
}

function readingOf(page: Page, line: string) {
  return page.getByRole("list", { name: `Peas reading of "${line}"` });
}

test.describe("Teach Peas", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("scenario A: teaching an alias shows its impact, and the note then reads powdered sugar", async ({
    page,
  }) => {
    const { alias } = fixture();
    await visit(page, "/teach");
    await page.getByRole("link", { name: new RegExp(`^${alias}`) }).click();
    await expect(
      page.getByRole("heading", { name: alias, level: 1 })
    ).toBeFocused();

    await page
      .getByRole("radio", { name: /another name for an existing concept/ })
      .check();
    await page
      .getByRole("combobox", { name: "Existing concept" })
      .fill("powdered");
    await page.getByRole("option", { name: "powdered sugar" }).click();
    await expect(page.getByTestId("impact-summary")).toHaveText(
      /1 mention would change: 1 newly resolved/
    );

    await page.getByRole("button", { name: /Apply/ }).click();
    await expect(
      page.getByText(`Taught: ${alias} is powdered sugar; 1 mention updated`)
    ).toBeVisible();

    await openTeachNote(page);
    await expect(readingOf(page, `2 tbsp ${alias}`)).toContainText(
      "powdered sugar"
    );
  });

  test("scenario B: green apples are apples with a color, not a new concept", async ({
    page,
  }) => {
    await openTeachNote(page);
    await expect(readingOf(page, "2 green apples")).toContainText(
      "apple (color: green)"
    );

    await visit(page, "/concepts?query=green%20apple");
    await expect(page.getByText("No concepts found.")).toBeVisible();
  });

  test("scenario C: boneless skinless chicken thighs keep their attributes, and the concept is part of chicken", async ({
    page,
  }) => {
    await openTeachNote(page);
    await expect(
      readingOf(page, "1 lb boneless skinless chicken thighs")
    ).toContainText("chicken thigh (bone: boneless, skin: skinless)");

    await visit(page, "/concepts?query=chicken%20thigh");
    await page.getByRole("link", { name: /^chicken thigh/ }).click();
    await expect(
      page.getByRole("heading", { name: "chicken thigh", level: 1 })
    ).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: "is part of" })
    ).toContainText("chicken thigh is part of chicken");
  });

  test("scenario E: a corrected mention is verified and survives another backfill", async ({
    page,
  }) => {
    const line = `1 cup ${fixture().correct} milk`;
    await openTeachNote(page);
    const reading = readingOf(page, line);
    await reading.getByRole("button", { name: /Peas reads this as/ }).click();
    await reading.getByRole("button", { name: "Correct", exact: true }).click();
    await reading
      .getByRole("combobox", { name: "Correct concept" })
      .fill("milk");
    await page.getByRole("option", { name: "milk", exact: true }).click();
    await reading.getByRole("button", { name: "Save correction" }).click();
    await expect(reading.getByRole("status")).toContainText(
      "Corrected to milk"
    );
    await expect(reading).toContainText("Verified");

    await rerunBackfill();
    await page.reload();
    await expect(readingOf(page, line)).toContainText("Verified");
  });

  test("the whole review works from the keyboard", async ({ page }) => {
    const { modifier } = fixture();
    await visit(page, "/teach");
    await page.getByRole("link", { name: new RegExp(`^${modifier}`) }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: modifier, level: 1 })
    ).toBeFocused();

    await page.keyboard.press("6");
    await expect(
      page.getByRole("radio", { name: new RegExp(`Ignore "${modifier}"`) })
    ).toBeChecked();
    await expect(page.getByTestId("impact-summary")).toHaveText(
      /1 mention would change/
    );
    await page.keyboard.press("Enter");
    await expect(page.getByText(`Taught: ignore ${modifier}`)).toBeVisible();
  });
});
