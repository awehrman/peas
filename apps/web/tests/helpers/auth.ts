import { type Page, expect, test } from "@playwright/test";

/**
 * Pages behind auth need a real account in the dev database. Set
 * E2E_EMAIL / E2E_PASSWORD (an ADMIN account for /parser) to run these specs.
 */
export const E2E_EMAIL = process.env.E2E_EMAIL;
export const E2E_PASSWORD = process.env.E2E_PASSWORD;

export function skipWithoutCredentials(): void {
  test.skip(
    !E2E_EMAIL || !E2E_PASSWORD,
    "Set E2E_EMAIL and E2E_PASSWORD to run authenticated specs"
  );
}

export async function signIn(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(E2E_EMAIL ?? "");
  await page.getByPlaceholder("Password").fill(E2E_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
