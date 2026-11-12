import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations, signIn, visit } from "./support/auth";
import { E2E_USER } from "./support/seed";

test.describe("Authentication", () => {
  test("sends signed-out visitors to the login page", async ({ page }) => {
    await page.goto("/notes");
    await expect(page).toHaveURL("/login");
    await expect(
      page.getByRole("heading", { name: "Sign in", level: 1 })
    ).toBeVisible();
  });

  test("shows an error for incorrect credentials and keeps the email", async ({
    page,
  }) => {
    await visit(page, "/login");
    await page.getByRole("textbox", { name: "Email" }).fill(E2E_USER.email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Incorrect email or password"
    );
    await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue(
      E2E_USER.email
    );
  });

  test("signs in, shows the app shell, and signs out", async ({ page }) => {
    await signIn(page);
    await expect(
      page.getByRole("button", { name: /delete all data/i })
    ).toBeVisible();

    await page.goto("/notes");
    await page.context().clearCookies();
    await page.goto("/notes");
    await expect(page).toHaveURL("/login");
  });

  test("login page has no WCAG 2.1 AA violations", async ({ page }) => {
    await visit(page, "/login");
    await expectNoAccessibilityViolations(page);
  });
});
