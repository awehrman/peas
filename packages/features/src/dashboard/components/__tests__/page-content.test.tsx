import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppNavigationProvider } from "../../../app-navigation";
import type { DashboardStats } from "../../types";
import { DashboardPageContent } from "../page-content";

function withNavigation(children: ReactNode) {
  return (
    <AppNavigationProvider push={vi.fn()}>{children}</AppNavigationProvider>
  );
}

const empty: DashboardStats = {
  noteCount: 0,
  recipeCount: 0,
  notesReadyToPromote: 0,
  conceptCount: 26,
  verifiedConceptCount: 24,
  instructionLineCount: 0,
  notesByStatus: {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    duplicate: 0,
  },
  ingredientLines: {
    total: 0,
    parsedSuccessfully: 0,
    parsedWithErrors: 0,
    awaitingParsing: 0,
    markedCorrect: 0,
    markedIncorrect: 0,
  },
  topConcepts: [],
  topSources: [],
  topCategories: [],
  topTags: [],
  notesBySavedYear: [],
};

describe("DashboardPageContent", () => {
  it("renders every card empty before the first import, with a link to import", () => {
    render(withNavigation(<DashboardPageContent stats={empty} />));

    expect(
      screen.getByRole("link", { name: "Import an Evernote export" })
    ).toHaveAttribute("href", "/import");
    expect(screen.getByText("Made from completed notes")).toBeInTheDocument();
    expect(screen.getByText("0 instruction steps")).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).toBeNull();
    expect(screen.getByText("No notes imported yet")).toBeInTheDocument();
    expect(
      screen.getByText("No ingredient lines parsed yet")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No lines have been resolved to concepts yet.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No source websites recorded yet.")
    ).toBeInTheDocument();
    expect(screen.getByText("No saved dates yet.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recipes saved by year" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Delete All Data/ })
    ).toBeNull();
  });

  it("shows import results once notes exist", () => {
    render(
      withNavigation(
        <DashboardPageContent
          stats={{
            ...empty,
            noteCount: 2,
            recipeCount: 1,
            notesReadyToPromote: 1,
            instructionLineCount: 9,
            notesByStatus: { ...empty.notesByStatus, completed: 1, failed: 1 },
            ingredientLines: {
              ...empty.ingredientLines,
              total: 10,
              parsedSuccessfully: 9,
              parsedWithErrors: 1,
            },
            notesBySavedYear: [{ year: 2024, count: 2 }],
          }}
          onCleanupAllData={vi.fn()}
        />
      )
    );

    expect(screen.getByText("1 imported successfully")).toBeInTheDocument();
    expect(
      screen.getByText("About 5 per note · 9 instruction steps")
    ).toBeInTheDocument();
    expect(screen.getByText("1 note needs a look")).toBeInTheDocument();
    expect(
      screen.getByText("90% of parsed ingredient lines parsed without errors")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Notes saved per year" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Delete All Data/ })
    ).toBeInTheDocument();
  });
});
