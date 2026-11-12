import type { ReactNode } from "react";

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppNavigationProvider } from "../../app-navigation";
import type { ConceptRef } from "../../teach/types";
import { ConceptDetailPageContent } from "../concept-detail";
import { ConceptsPageContent } from "../concept-list";
import type { ConceptDetail } from "../types";

const CHICKEN: ConceptRef = {
  id: "00000000-0000-4000-8000-000000000001",
  canonicalName: "chicken",
  status: "VERIFIED",
};
const THIGH: ConceptRef = {
  id: "00000000-0000-4000-8000-000000000002",
  canonicalName: "chicken thigh",
  status: "VERIFIED",
};
const BONELESS: ConceptRef = {
  id: "00000000-0000-4000-8000-000000000003",
  canonicalName: "boneless thigh",
  status: "PROPOSED",
};

function withNavigation(children: ReactNode, push = vi.fn()) {
  return <AppNavigationProvider push={push}>{children}</AppNavigationProvider>;
}

const concept: ConceptDetail = {
  id: THIGH.id,
  slug: "chicken-thigh",
  canonicalName: "chicken thigh",
  status: "VERIFIED",
  description: "Dark meat",
  isComposed: false,
  mergedInto: null,
  entries: [
    { id: "e1", text: "chicken thigh", kind: "CANONICAL", status: "ACTIVE" },
    { id: "e2", text: "chicken thighs", kind: "PLURAL", status: "ACTIVE" },
    { id: "e3", text: "thigh meat", kind: "ALIAS", status: "PROPOSED" },
    { id: "e4", text: "cuisse", kind: null, status: "ACTIVE" },
  ],
  parents: [{ id: "r1", type: "PART_OF", status: "ACTIVE", concept: CHICKEN }],
  children: [{ id: "r2", type: "IS_A", status: "PROPOSED", concept: BONELESS }],
  attributes: [
    {
      attributeValueId: "a1",
      definitionKey: "bone",
      valueKey: "bone_in",
      label: "Bone-in",
    },
  ],
  classifications: [
    {
      key: "POULTRY",
      kind: "FOOD_GROUP",
      value: "TRUE",
      source: "INHERITED",
      inheritedFrom: CHICKEN,
    },
    {
      key: "VEGAN",
      kind: "DIETARY",
      value: "FALSE",
      source: "EXPLICIT",
      inheritedFrom: null,
    },
    {
      key: "ALLERGEN_X",
      kind: "ALLERGEN",
      value: "UNKNOWN",
      source: "CONFLICT",
      inheritedFrom: null,
    },
  ],
  mentions: [
    {
      mentionId: "m1",
      rawText: "1 lb chicken thighs",
      lineText: "1 lb chicken thighs",
      noteId: "n1",
      noteTitle: "Stew",
      verified: true,
    },
    {
      mentionId: "m2",
      rawText: "2 thighs",
      lineText: "2 thighs",
      noteId: null,
      noteTitle: null,
      verified: false,
    },
  ],
  decisions: [
    {
      id: "d1",
      type: "ADD_RELATIONSHIP",
      revision: 9,
      createdAt: "2026-11-12T10:00:00.000Z",
      username: "allie",
      reverted: false,
      canRevert: true,
    },
    {
      id: "d0",
      type: "MAP_TO_CONCEPT",
      revision: 8,
      createdAt: "2026-11-11T10:00:00.000Z",
      username: "allie",
      reverted: true,
      canRevert: false,
    },
  ],
};

describe("ConceptDetailPageContent", () => {
  it("shows names by kind, relationships both ways, attributes, inherited classifications, mentions, and decisions", () => {
    render(withNavigation(<ConceptDetailPageContent concept={concept} />));

    expect(
      screen.getByRole("heading", { name: "chicken thigh", level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText("Canonical name")).toBeInTheDocument();
    expect(screen.getByText("Plurals")).toBeInTheDocument();
    expect(screen.getAllByText("(proposed)")).toHaveLength(2);
    expect(screen.getByText("Other")).toBeInTheDocument();
    expect(screen.getByText(/is part of/).closest("li")).toHaveTextContent(
      "chicken thigh is part of chicken"
    );
    expect(screen.getByText(/is a kind of/).closest("li")).toHaveTextContent(
      "boneless thigh is a kind of chicken thigh(proposed)"
    );
    expect(screen.getByText("bone: Bone-in")).toBeInTheDocument();
    expect(screen.getByText("POULTRY").closest("li")).toHaveTextContent(
      "POULTRY: true (inherited from chicken)"
    );
    expect(screen.getByText("(conflicting parents)")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "1 lb chicken thighs" })
    ).toHaveAttribute("href", "/notes/n1");
    expect(
      screen.getByRole("link", { name: "1 lb chicken thighs" }).closest("li")
    ).toHaveTextContent("1 lb chicken thighs (Stew) verified");
    expect(
      screen.getByText("map to concept").closest("li")
    ).toHaveTextContent("reverted");
    expect(
      screen.queryByRole("button", { name: "Revert" })
    ).not.toBeInTheDocument();
  });

  it("reverts a decision after confirming and adds relationships through decisions", async () => {
    const onApplyDecision = vi.fn(async () => ({
      success: true as const,
      data: {
        summary: "Taught: chicken thigh PART_OF chicken",
        mentionsUpdated: 0,
        needsBackgroundReinterpret: false,
        reinterpretCommand: null,
      },
    }));
    const onSearchConcepts = vi.fn(async () => [CHICKEN]);
    render(
      withNavigation(
        <ConceptDetailPageContent
          concept={concept}
          onApplyDecision={onApplyDecision}
          onSearchConcepts={onSearchConcepts}
        />
      )
    );

    fireEvent.click(screen.getByRole("button", { name: "Revert" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Revert this decision?",
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Revert" }));
    await waitFor(() =>
      expect(onApplyDecision).toHaveBeenCalledWith(
        { type: "REVERT", decisionId: "d1" },
        null
      )
    );

    fireEvent.change(screen.getByLabelText("chicken thigh…"), {
      target: { value: "PART_OF" },
    });
    fireEvent.change(
      screen.getByRole("combobox", { name: "Related concept" }),
      { target: { value: "chick" } }
    );
    fireEvent.mouseDown(
      await screen.findByRole("option", { name: "chicken" }, { timeout: 2000 })
    );
    fireEvent.click(screen.getByRole("button", { name: "Add relationship" }));
    await waitFor(() =>
      expect(onApplyDecision).toHaveBeenCalledWith(
        {
          type: "ADD_RELATIONSHIP",
          sourceConceptId: THIGH.id,
          targetConceptId: CHICKEN.id,
          relationshipType: "PART_OF",
        },
        null
      )
    );
    expect(
      await screen.findByText("Taught: chicken thigh PART_OF chicken")
    ).toBeInTheDocument();
  });

  it("shows merged and empty concepts", () => {
    render(
      withNavigation(
        <ConceptDetailPageContent
          concept={{
            ...concept,
            status: "DEPRECATED",
            isComposed: true,
            mergedInto: CHICKEN,
            description: null,
            entries: [],
            parents: [],
            children: [],
            attributes: [],
            classifications: [],
            mentions: [],
            decisions: [],
          }}
        />
      )
    );
    expect(screen.getByText(/Merged into/)).toHaveTextContent(
      "Merged into chicken"
    );
    expect(screen.getByText("made from other ingredients")).toBeInTheDocument();
    for (const empty of [
      "No entries.",
      "No broader concepts yet.",
      "No narrower concepts yet.",
      "No characterizing attributes.",
      "No classifications.",
      "No stored mentions yet.",
      "No decisions yet.",
    ]) {
      expect(screen.getByText(empty)).toBeInTheDocument();
    }
  });
});

describe("ConceptsPageContent", () => {
  it("lists concepts with counts, searches, and pages", () => {
    const push = vi.fn();
    render(
      withNavigation(
        <ConceptsPageContent
          query="thigh"
          data={{
            items: [
              {
                id: THIGH.id,
                slug: "chicken-thigh",
                canonicalName: "chicken thigh",
                status: "VERIFIED",
                entryCount: 2,
                mentionCount: 1,
              },
              {
                id: BONELESS.id,
                slug: "boneless",
                canonicalName: "boneless thigh",
                status: "PROPOSED",
                entryCount: 1,
                mentionCount: 3,
              },
            ],
            total: 120,
            page: 1,
            pageSize: 50,
          }}
        />,
        push
      )
    );
    expect(
      screen.getByText("120 concepts matching “thigh”")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /chicken thigh/ })
    ).toHaveTextContent("2 names · 1 mention");
    expect(
      screen.getByRole("link", { name: /boneless thigh/ })
    ).toHaveTextContent("proposed1 name · 3 mentions");
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search concepts" }),
      { target: { value: "sugar" } }
    );
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenCalledWith("/concepts?query=sugar");
  });

  it("says when nothing matches", () => {
    render(
      withNavigation(
        <ConceptsPageContent
          data={{ items: [], total: 0, page: 1, pageSize: 50 }}
        />
      )
    );
    expect(screen.getByText("No concepts found.")).toBeInTheDocument();
  });
});
