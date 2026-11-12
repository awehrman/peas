import { E2E_USER } from "./seed";

import AxeBuilder from "@axe-core/playwright";
import { type Page, expect } from "@playwright/test";

/** Waits until React has hydrated the server-rendered page; clicks before that are lost or trigger full page loads. */
export async function waitForHydration(page: Page): Promise<void> {
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
}

/** Full page load followed by hydration. */
export async function visit(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForHydration(page);
}

/** Signs in through the real form and waits for the dashboard. */
export async function signIn(page: Page): Promise<void> {
  await visit(page, "/login");
  await page.getByRole("textbox", { name: "Email" }).fill(E2E_USER.email);
  await page.getByLabel("Password").fill(E2E_USER.password);
  await page.getByLabel("Password").press("Enter");
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { name: "Dashboard", level: 1 })
  ).toBeVisible();
  // WebKit logs requests cancelled by the next navigation as console errors, which tests that watch the console would count.
  await page.waitForLoadState("networkidle");
}

/**
 * Runs axe against WCAG 2.1 A and AA rules and fails with a readable list of violations.
 *
 * @example
 * await expectNoAccessibilityViolations(page);
 */
export async function expectNoAccessibilityViolations(
  page: Page,
  { include }: { include?: string } = {}
): Promise<void> {
  const builder = new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
  ]);
  const results = await (include ? builder.include(include) : builder).analyze();
  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help} -> ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`
  );
  expect(summary, "accessibility violations").toEqual([]);
}
