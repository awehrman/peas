import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations } from "../helpers/a11y";
import { signIn, skipWithoutCredentials } from "../helpers/auth";

// /parser is admin-only; E2E_EMAIL must belong to an ADMIN user.
test.describe("Parser rule builder", () => {
  skipWithoutCredentials();

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/parser");
    await expect(page).toHaveURL(/\/parser/);
  });

  test("tabs between rules, tests and the compiled grammar with the keyboard", async ({ page }) => {
    const rulesTab = page.getByRole("tab", { name: /Rules/ });
    await rulesTab.focus();
    await page.keyboard.press("ArrowRight");

    await expect(page.getByRole("tab", { name: /Tests/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: /Grammar tests/ })).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("heading", { name: "Compiled grammar" })).toBeVisible();
  });

  test("validates a new rule before saving", async ({ page }) => {
    await page.getByRole("button", { name: "Add rule" }).click();
    const form = page.getByRole("region", { name: "New rule" });

    await form.getByLabel("Rule name").fill("2cups");
    await form.getByRole("button", { name: "Add rule" }).click();
    await expect(form.getByText(/Use letters, numbers and underscores/)).toBeVisible();
    await expect(form.getByText("Rule expression is required")).toBeVisible();

    await form.getByLabel("Rule name").fill("unitKeyword");
    await expect(form.getByLabel("Label", { exact: true })).toHaveValue("Unit Keyword");

    await form.getByRole("button", { name: "Cancel" }).click();
    await expect(form).toBeHidden();
  });

  test("splits a test line into expected segments", async ({ page }) => {
    await page.getByRole("tab", { name: /Tests/ }).click();
    await page.getByRole("button", { name: "Add test" }).click();

    const dialog = page.getByRole("dialog", { name: "Add grammar test" });
    await dialog.getByLabel("Ingredient line").fill("2 apples");
    await dialog.getByRole("button", { name: "Split on spaces" }).click();

    const values = dialog.getByLabel("Value", { exact: true });
    await expect(values.nth(0)).toHaveValue("2");
    await expect(dialog.getByLabel("Type", { exact: true }).nth(0)).toHaveValue("amount");
    await expect(values.nth(1)).toHaveValue("apples");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("shows the import parser switch with static v1 available", async ({ page }) => {
    const staticOption = page.getByRole("radio", { name: /Static v1 grammar/ });
    await expect(staticOption).toBeEnabled();
    await expect(page.getByRole("button", { name: "Use for imports" })).toBeVisible();
  });

  test("has no WCAG 2.1 AA violations on each tab", async ({ page }) => {
    await expectNoAccessibilityViolations(page, { include: "main" });

    await page.getByRole("tab", { name: /Tests/ }).click();
    await expectNoAccessibilityViolations(page, { include: "main" });

    await page.getByRole("tab", { name: "Compiled grammar" }).click();
    await expectNoAccessibilityViolations(page, { include: "main" });
  });
});
