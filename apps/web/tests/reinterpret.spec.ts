import { type Page, type Route, expect, test } from "@playwright/test";

import { signIn, visit } from "./support/auth";
import { E2E_TEACH, type E2eProject } from "./support/seed";

const JOB_ID = "reinterpret-999";

function job(status: "PROCESSING" | "COMPLETED", processedCount: number) {
  return {
    __typename: "Job",
    jobId: JOB_ID,
    type: "REINTERPRET",
    status,
    noteId: null,
    processedCount,
    totalCount: 1200,
    errorMessage: null,
    retryCount: 0,
    startedAt: null,
    completedAt: null,
  };
}

/**
 * Stands in for a decision that affects more lines than one request reinterprets: ApplyDecision answers with a background job, and JobStatus reports it running and then finished. Nothing reaches the database, so the seeded knowledge is untouched.
 */
async function fakeBackgroundReinterpretation(page: Page): Promise<void> {
  let polls = 0;
  await page.route("**/api/graphql", async (route: Route) => {
    const body = route.request().postDataJSON() as {
      operationName?: string;
    } | null;
    if (body?.operationName === "ApplyDecision") {
      await route.fulfill({
        json: {
          data: {
            applyDecision: {
              __typename: "ApplyDecisionPayload",
              success: true,
              message: null,
              effect: {
                __typename: "MutationEffect",
                changed: [],
                evicted: [],
                invalidatedDomains: [],
                lexiconRevision: null,
                reprocessingJobId: JOB_ID,
              },
              decisionId: "00000000-0000-7000-8000-000000000999",
              revision: 999,
              summary: "Taught: a big change",
              mentionsUpdated: 0,
              needsBackgroundReinterpret: true,
              reinterpretCommand: null,
            },
          },
        },
      });
      return;
    }
    if (body?.operationName === "JobStatus") {
      polls += 1;
      await route.fulfill({
        json: {
          data: {
            job: polls < 3 ? job("PROCESSING", 400) : job("COMPLETED", 1200),
          },
        },
      });
      return;
    }
    await route.continue();
  });
}

test.describe("Background reinterpretation", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("a large-impact decision shows reinterpretation progress until it finishes", async ({
    page,
  }) => {
    const { alias } =
      E2E_TEACH.perProject[test.info().project.name as E2eProject];
    await fakeBackgroundReinterpretation(page);
    await visit(page, "/teach");
    await page.getByRole("link", { name: new RegExp(`^${alias}\\s`) }).click();
    await page
      .getByRole("radio", { name: /another name for an existing concept/ })
      .check();
    await page
      .getByRole("combobox", { name: "Existing concept" })
      .fill("powdered");
    await page.getByRole("option", { name: "powdered sugar" }).click();
    await page.getByRole("button", { name: /Apply/ }).click();

    await expect(
      page.getByText(
        "Taught: a big change; many mentions are affected and are being updated in the background"
      )
    ).toBeVisible();
    const banner = page.getByTestId("reinterpret-progress");
    await expect(banner).toContainText(
      "Updating mentions in the background: 400 of 1,200 lines"
    );
    await expect(
      banner.getByRole("progressbar", { name: "Reinterpretation progress" })
    ).toHaveAttribute("aria-valuenow", "33");
    await expect(banner).toContainText(
      "Mentions are up to date: 1,200 lines reinterpreted",
      { timeout: 15_000 }
    );
  });
});
