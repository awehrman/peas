import { type Page, expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations, signIn, visit } from "./support/auth";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

async function firstDiscoveryHref(page: Page): Promise<string> {
  await visit(page, "/teach");
  const href = await page
    .getByRole("list")
    .filter({ has: page.locator('a[href^="/teach/0"]') })
    .locator("a")
    .first()
    .getAttribute("href");
  if (!href) throw new Error("The review queue is empty");
  return href;
}

async function conceptHref(page: Page): Promise<string> {
  await visit(page, "/concepts?query=chicken%20thigh");
  const href = await page
    .getByRole("link", { name: /^chicken thigh/ })
    .getAttribute("href");
  if (!href) throw new Error("chicken thigh is missing from the concepts list");
  return href;
}

test.describe("Teach Peas accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  for (const viewport of VIEWPORTS) {
    test(`queue, review card, and concept page have no WCAG 2.1 AA violations (${viewport.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      await visit(page, "/teach");
      await expect(
        page.getByRole("heading", { name: "Teach Peas", level: 1 })
      ).toBeVisible();
      await expectNoAccessibilityViolations(page);

      await visit(page, await firstDiscoveryHref(page));
      await expect(
        page.getByRole("group", { name: /How should Peas read/ })
      ).toBeVisible();
      await expect(page.getByTestId("impact-summary")).toBeVisible();
      await expectNoAccessibilityViolations(page);

      await visit(page, await conceptHref(page));
      await expect(
        page.getByRole("heading", { name: "chicken thigh", level: 1 })
      ).toBeVisible();
      await expectNoAccessibilityViolations(page);
    });
  }

  test("the review card moves focus to its heading, labels its options, and announces the impact politely", async ({
    page,
  }) => {
    await visit(page, await firstDiscoveryHref(page));

    await expect(
      page.locator("main").getByRole("heading", { level: 1 })
    ).toBeFocused();
    const options = page
      .getByRole("group", { name: /How should Peas read/ })
      .getByRole("radio");
    expect(await options.count()).toBeGreaterThan(1);
    await expect(page.locator('[aria-live="polite"]')).toHaveCount(1);

    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("article").getByRole("link", { name: "Review queue" })
    ).not.toBeFocused();
    await expect(page.locator(":focus")).toBeVisible();
  });
});
