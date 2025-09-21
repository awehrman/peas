import type { TestRunnerConfig } from "@storybook/test-runner";
import { getStoryContext } from "@storybook/test-runner";

const config: TestRunnerConfig = {
  setup() {
    // Global setup for test runner
  },
  async preVisit(page, context) {
    // Setup before visiting each story
    await page.setViewportSize({ width: 1200, height: 800 });
  },
  async postVisit(page, context) {
    // Cleanup after visiting each story
    const storyContext = await getStoryContext(page, context);

    // Add custom assertions for import stories
    if (storyContext.title.includes("Import/")) {
      // Wait for any animations or async operations to complete
      await page.waitForTimeout(500);

      // Check for common error states
      const errorElements = await page
        .locator('[data-testid*="error"], .error, [class*="error"]')
        .count();
      if (errorElements > 0) {
        const errorText = await page
          .locator('[data-testid*="error"], .error, [class*="error"]')
          .first()
          .textContent();
        console.warn(
          `Found error element in ${storyContext.title}: ${errorText}`
        );
      }

      // Check for loading states that might indicate incomplete renders
      const loadingElements = await page
        .locator('[data-testid*="loading"], .loading, [class*="loading"]')
        .count();
      if (loadingElements > 0) {
        console.log(
          `Found loading elements in ${storyContext.title}, waiting for completion...`
        );
        await page.waitForTimeout(1000);
      }
    }
  },
  tags: {
    include: ["autodocs"],
    exclude: ["skip-test"],
  },
};

export default config;
