import type { ReactNode } from "react";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppNavigationProvider } from "../../app-navigation";
import { ConceptOccurrencesPageContent } from "../concept-occurrences";
import type {
  ConceptOccurrence,
  ConceptOccurrenceFilterOptions,
  ConceptOccurrenceFilters,
} from "../types";

const CHICKEN = {
  id: "00000000-0000-4000-8000-000000000001",
  canonicalName: "chicken",
};
const THIGH = {
  id: "00000000-0000-4000-8000-000000000002",
  canonicalName: "chicken thigh",
  status: "VERIFIED" as const,
};

function occurrence(overrides: Partial<ConceptOccurrence>): ConceptOccurrence {
  return {
    mentionId: "m1",
    lineId: "l1",
    lineText: "1 chicken",
    span: { start: 0, end: 9, text: "1 chicken" },
    noteId: "n1",
    noteTitle: "Roast chicken",
    recipeId: null,
    recipeTitle: null,
    concept: { ...CHICKEN, status: "VERIFIED" },
    path: [],
    status: "AUTO_RESOLVED",
    preparations: [],
    attributes: [],
    ...overrides,
  };
}

const items: ConceptOccurrence[] = [
  occurrence({}),
  occurrence({
    mentionId: "m2",
    lineId: "l2",
    lineText: "Add 1 lb boneless chicken thighs, diced",
    span: { start: 4, end: 39, text: "1 lb boneless chicken thighs, diced" },
    noteId: "n2",
    noteTitle: "Braised thighs",
    recipeId: "r2",
    recipeTitle: "Braised thighs",
    concept: THIGH,
    path: ["PART_OF"],
    preparations: ["Dice"],
    attributes: ["Bone: Boneless"],
  }),
  occurrence({
    mentionId: "m3",
    lineId: "l3",
    lineText: "2 heritage chicken legs",
    span: { start: 0, end: 23, text: "2 heritage chicken legs" },
    noteId: "n2",
    noteTitle: "Braised thighs",
    recipeId: "r2",
    status: "NEEDS_REVIEW",
  }),
];

const options: ConceptOccurrenceFilterOptions = {
  preparations: [{ key: "dice", label: "Dice" }],
  attributes: [{ key: "bone:boneless", label: "Bone: Boneless" }],
  sources: [{ id: "s1", label: "Weeknight Book", notes: 2 }],
  categories: [{ id: "c1", name: "Dinner", notes: 1 }],
};

const OFF: ConceptOccurrenceFilters = {
  includeMadeFrom: false,
  includeNeedsReview: false,
};

function renderPage(
  overrides: Partial<Parameters<typeof ConceptOccurrencesPageContent>[0]> = {}
) {
  const onFiltersChange = vi.fn();
  const wrap = (children: ReactNode) => (
    <AppNavigationProvider push={vi.fn()}>{children}</AppNavigationProvider>
  );
  render(
    wrap(
      <ConceptOccurrencesPageContent
        concept={CHICKEN}
        page={{ items, total: 3, nextCursor: null }}
        options={options}
        filters={OFF}
        onFiltersChange={onFiltersChange}
        backHref={`/concepts/${CHICKEN.id}`}
        {...overrides}
      />
    )
  );
  return { onFiltersChange };
}

describe("ConceptOccurrencesPageContent", () => {
  it("groups lines by note, linking each note and recipe", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Lines with chicken" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("3 mentions, including kinds and parts")
    ).toBeInTheDocument();
    const groups = screen.getAllByRole("heading", { level: 2 });
    expect(groups.map((heading) => heading.textContent)).toEqual([
      "Roast chicken",
      "Braised thighsRecipe",
    ]);
    expect(screen.getByRole("link", { name: "Roast chicken" })).toHaveAttribute(
      "href",
      "/notes/n1"
    );
    expect(
      screen.getByRole("link", { name: "Recipe: Braised thighs" })
    ).toHaveAttribute("href", "/recipes/r2");
    expect(screen.getByRole("link", { name: "chicken" })).toHaveAttribute(
      "href",
      `/concepts/${CHICKEN.id}`
    );
  });

  it("highlights the mention and explains how it matched", () => {
    renderPage();
    expect(
      screen.getByText("1 lb boneless chicken thighs, diced", {
        selector: "mark",
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "chicken thigh" })).toHaveAttribute(
      "href",
      `/concepts/${THIGH.id}`
    );
    expect(
      screen.getByText(/\(part of chicken\) · Dice · Bone: Boneless/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/chicken · waiting for review/)
    ).toBeInTheDocument();
  });

  it("shows the line unhighlighted when the span does not fit it", () => {
    renderPage({
      page: {
        items: [occurrence({ span: { start: 4, end: 99, text: "" } })],
        total: 1,
        nextCursor: null,
      },
    });
    expect(
      screen.queryByText("1 chicken", { selector: "mark" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("1 mention, including kinds and parts")
    ).toBeInTheDocument();
  });

  it("reports filter changes, and offers waiting-for-review status only when those mentions are included", () => {
    const { onFiltersChange } = renderPage();
    const form = screen.getByRole("group", { name: "Filter lines" });
    fireEvent.change(within(form).getByLabelText("Preparation"), {
      target: { value: "dice" },
    });
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      ...OFF,
      preparationKey: "dice",
    });
    fireEvent.change(within(form).getByLabelText("Attribute"), {
      target: { value: "bone:boneless" },
    });
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      ...OFF,
      attribute: "bone:boneless",
    });
    fireEvent.change(within(form).getByLabelText("Source"), {
      target: { value: "s1" },
    });
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      ...OFF,
      sourceId: "s1",
    });
    fireEvent.change(within(form).getByLabelText("Category"), {
      target: { value: "c1" },
    });
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      ...OFF,
      categoryId: "c1",
    });
    fireEvent.change(within(form).getByLabelText("Status"), {
      target: { value: "VERIFIED" },
    });
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      ...OFF,
      status: "VERIFIED",
    });
    expect(
      within(form).queryByRole("option", { name: "Waiting for review" })
    ).not.toBeInTheDocument();
    expect(
      within(form).getByRole("option", { name: "Weeknight Book (2)" })
    ).toBeInTheDocument();
    fireEvent.click(
      within(form).getByRole("checkbox", { name: "Include foods made from it" })
    );
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      ...OFF,
      includeMadeFrom: true,
    });
  });

  it("drops the waiting-for-review status filter when those mentions are switched off", () => {
    const filters: ConceptOccurrenceFilters = {
      includeMadeFrom: true,
      includeNeedsReview: true,
      status: "NEEDS_REVIEW",
    };
    const { onFiltersChange } = renderPage({ filters });
    expect(
      screen.getByRole("option", { name: "Waiting for review" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "3 mentions, including kinds, parts, and foods made from it"
      )
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Include mentions waiting for review",
      })
    );
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      includeMadeFrom: true,
      includeNeedsReview: false,
      status: undefined,
    });
  });

  it("clears narrowing filters but keeps the switches", () => {
    const filters: ConceptOccurrenceFilters = {
      includeMadeFrom: true,
      includeNeedsReview: false,
      preparationKey: "dice",
    };
    const { onFiltersChange } = renderPage({ filters });
    fireEvent.change(screen.getByLabelText("Preparation"), {
      target: { value: "" },
    });
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      ...filters,
      preparationKey: undefined,
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      includeMadeFrom: true,
      includeNeedsReview: false,
    });
  });

  it("loads more while more pages exist", () => {
    const onLoadMore = vi.fn();
    renderPage({ page: { items, total: 120, nextCursor: "abc" }, onLoadMore });
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Showing 3 of 120")).toBeInTheDocument();
  });

  it("shows loading and updating states", () => {
    renderPage({
      page: { items, total: 120, nextCursor: "abc" },
      onLoadMore: vi.fn(),
      isLoadingMore: true,
      isUpdating: true,
    });
    expect(screen.getByRole("button", { name: "Loading…" })).toBeDisabled();
    expect(screen.getByText("Updating…")).toBeInTheDocument();
  });

  it("explains an empty result and hides Load more on the last page", () => {
    renderPage({
      page: { items: [], total: 0, nextCursor: null },
      onLoadMore: vi.fn(),
    });
    expect(
      screen.getByText("No lines match these filters.")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Load more" })
    ).not.toBeInTheDocument();
  });

  it("names notes without a title", () => {
    renderPage({
      page: {
        items: [occurrence({ noteTitle: null })],
        total: 1,
        nextCursor: null,
      },
    });
    expect(
      screen.getByRole("link", { name: "Untitled note" })
    ).toBeInTheDocument();
  });
});
