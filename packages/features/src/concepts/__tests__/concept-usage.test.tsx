import type { ReactNode } from "react";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppNavigationProvider } from "../../app-navigation";
import { ConceptUsagePanel } from "../concept-usage";
import type { ConceptExplorerData, ConceptExplorerOptions } from "../types";

const THIGH_ID = "00000000-0000-4000-8000-000000000002";
const BREAST_ID = "00000000-0000-4000-8000-000000000003";

const data: ConceptExplorerData = {
  usage: {
    expand: ["IS_A", "PART_OF"],
    includeNeedsReview: false,
    direct: { mentions: 3, lines: 3, notes: 2, recipes: 1 },
    expanded: { mentions: 15, lines: 14, notes: 11, recipes: 5 },
    byStatus: { autoResolved: 3, verified: 0, needsReview: 2 },
    contributors: [
      {
        concept: {
          id: THIGH_ID,
          canonicalName: "chicken thigh",
          status: "VERIFIED",
        },
        path: ["PART_OF"],
        depth: 1,
        counts: { mentions: 12, lines: 11, notes: 9, recipes: 4 },
      },
      {
        concept: {
          id: BREAST_ID,
          canonicalName: "boneless breast",
          status: "VERIFIED",
        },
        path: ["PART_OF", "IS_A"],
        depth: 2,
        counts: { mentions: 1, lines: 1, notes: 1, recipes: 0 },
      },
    ],
  },
  observedForms: {
    forms: [
      {
        entryId: "e1",
        text: "chicken",
        kind: "CANONICAL",
        status: "ACTIVE",
        mentions: 3,
        notes: 2,
        example: "1 whole chicken",
      },
      {
        entryId: "e2",
        text: "chooks",
        kind: "REGIONAL",
        status: "PROPOSED",
        mentions: 0,
        notes: 0,
        example: null,
      },
    ],
    otherMentions: 1,
  },
  distributions: {
    preparations: [
      {
        preparationKey: "dice",
        label: "dice",
        degreeKey: null,
        direct: 0,
        expanded: 4,
      },
      {
        preparationKey: "chop",
        label: "chop",
        degreeKey: "fine",
        direct: 1,
        expanded: 1,
      },
    ],
    attributes: [
      {
        definitionKey: "bone",
        definitionName: "Bone",
        valueKey: "boneless",
        label: "boneless",
        direct: 0,
        expanded: 8,
        asserted: 6,
      },
    ],
    modifiers: [],
  },
};

const OFF: ConceptExplorerOptions = {
  includeMadeFrom: false,
  includeNeedsReview: false,
};

function renderPanel(
  overrides: Partial<Parameters<typeof ConceptUsagePanel>[0]> = {}
) {
  const onOptionsChange = vi.fn();
  const wrap = (children: ReactNode) => (
    <AppNavigationProvider push={vi.fn()}>{children}</AppNavigationProvider>
  );
  render(
    wrap(
      <ConceptUsagePanel
        conceptName="chicken"
        data={data}
        options={OFF}
        onOptionsChange={onOptionsChange}
        {...overrides}
      />
    )
  );
  return { onOptionsChange };
}

describe("ConceptUsagePanel", () => {
  it("shows direct and expanded counts side by side, labelled", () => {
    renderPanel();
    const table = screen.getByRole("table", {
      name: "How often chicken appears",
    });
    expect(
      within(table).getByRole("columnheader", { name: "Directly" })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "With kinds and parts" })
    ).toBeInTheDocument();
    const mentions = within(table).getByRole("row", { name: /Mentions/ });
    expect(mentions).toHaveTextContent("Mentions315");
    expect(
      within(table).getByRole("row", { name: /Recipes/ })
    ).toHaveTextContent("Recipes15");
  });

  it("names the wider expansion when foods made from it are included", () => {
    renderPanel({
      options: { includeMadeFrom: true, includeNeedsReview: false },
    });
    expect(
      screen.getByRole("columnheader", {
        name: "With kinds, parts, and foods made from it",
      })
    ).toBeInTheDocument();
  });

  it("lists contributing foods with the path that reached them", () => {
    renderPanel();
    expect(screen.getByRole("link", { name: "chicken thigh" })).toHaveAttribute(
      "href",
      `/concepts/${THIGH_ID}`
    );
    expect(screen.getByText(/\(part of chicken\)/)).toBeInTheDocument();
    expect(
      screen.getByText(/\(a kind of → part of chicken\)/)
    ).toBeInTheDocument();
    expect(screen.getByText(/12 mentions in 9 notes/)).toBeInTheDocument();
  });

  it("links to every counted mention when given a link and there are some", () => {
    renderPanel({ occurrencesHref: "/concepts/c/usage" });
    expect(
      screen.getByRole("link", { name: "See all 15 mentions" })
    ).toHaveAttribute("href", "/concepts/c/usage");
  });

  it("says how many mentions wait for review only while they are left out", () => {
    renderPanel();
    expect(
      screen.getByText(/2 more mentions are waiting for review/)
    ).toBeInTheDocument();
  });

  it("hides the waiting note once mentions waiting for review are counted", () => {
    renderPanel({
      options: { includeMadeFrom: false, includeNeedsReview: true },
    });
    expect(
      screen.queryByText(/waiting for review with/)
    ).not.toBeInTheDocument();
  });

  it("reports each switch change", () => {
    const { onOptionsChange } = renderPanel();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Include foods made from it" })
    );
    expect(onOptionsChange).toHaveBeenLastCalledWith({
      includeMadeFrom: true,
      includeNeedsReview: false,
    });
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Include mentions waiting for review",
      })
    );
    expect(onOptionsChange).toHaveBeenLastCalledWith({
      includeMadeFrom: false,
      includeNeedsReview: true,
    });
  });

  it("lists names by use, including unused and proposed ones", () => {
    renderPanel();
    expect(screen.getByText(/: 3 mentions in 2 notes/)).toBeInTheDocument();
    expect(
      screen.getByText("“1 whole chicken”", { exact: false })
    ).toBeInTheDocument();
    expect(screen.getByText(/regional name, proposed/)).toBeInTheDocument();
    expect(screen.getByText(/not used yet/)).toBeInTheDocument();
    expect(
      screen.getByText(/1 mention reaches this food without one of its names/)
    ).toBeInTheDocument();
  });

  it("tabulates preparations and attributes with direct and expanded counts", () => {
    renderPanel();
    const preparations = screen.getByRole("table", {
      name: "How chicken is prepared",
    });
    expect(
      within(preparations).getByRole("row", { name: /chop \(fine\)/ })
    ).toHaveTextContent("chop (fine)11");
    const attributes = screen.getByRole("table", {
      name: "How chicken is described",
    });
    expect(
      within(attributes).getByRole("row", { name: /Bone: boneless/ })
    ).toHaveTextContent("6 written in the text");
    expect(
      screen.queryByRole("table", { name: /Notes on amounts/ })
    ).not.toBeInTheDocument();
  });

  it("shows a loading state before the first answer", () => {
    renderPanel({ data: null });
    expect(screen.getByText("Loading usage…")).toBeInTheDocument();
  });

  it("announces updates politely while keeping the previous numbers", () => {
    renderPanel({ isLoading: true });
    expect(screen.getByText("Updating…")).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "How often chicken appears" })
    ).toBeInTheDocument();
  });

  it("explains empty distributions", () => {
    renderPanel({
      data: {
        ...data,
        distributions: { preparations: [], attributes: [], modifiers: [] },
      },
    });
    expect(
      screen.getByText("No preparations or descriptions recorded yet.")
    ).toBeInTheDocument();
  });
});
