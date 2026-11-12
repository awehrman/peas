import AxeBuilder from "@axe-core/playwright";
import { type Page, expect } from "@playwright/test";

const WCAG_21_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * Runs axe against WCAG 2.1 AA and fails with a readable list of violations.
 */
export async function expectNoAccessibilityViolations(
  page: Page,
  options: { include?: string; exclude?: string[] } = {}
): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags(WCAG_21_AA_TAGS);
  if (options.include) builder = builder.include(options.include);
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector);

  const { violations } = await builder.analyze();
  const report = violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help}\n` +
      violation.nodes.map((node) => `  - ${node.target.join(" ")}`).join("\n")
  );

  expect(report, report.join("\n\n")).toEqual([]);
}
