import type { ReactNode } from "react";

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppNavigationProvider } from "../../app-navigation";
import { decisionOptionsFor, initialPayload } from "../decision-options";
import { DiscoveryQueuePageContent } from "../discovery-queue";
import { DiscoveryReviewPageContent } from "../discovery-review";
import { HighlightedLine, RoleLegend } from "../highlighted-line";
import { ImpactPreview } from "../impact-preview";
import { MentionPanel, type NoteMention } from "../mention-panel";
import { PlaygroundPageContent } from "../playground";
import type {
  ConceptRef,
  DecisionPreview,
  ResolutionView,
  TeachDiscovery,
  TeachVocabulary,
} from "../types";

const MILK: ConceptRef = {
  id: "00000000-0000-4000-8000-000000000001",
  canonicalName: "milk",
  status: "VERIFIED",
};
const TOMATO: ConceptRef = {
  id: "00000000-0000-4000-8000-000000000002",
  canonicalName: "tomato",
  status: "VERIFIED",
};

const vocabulary: TeachVocabulary = {
  definitions: [{ id: "def-color", key: "color", name: "Color" }],
  attributeValues: [
    {
      id: "00000000-0000-4000-8000-0000000000a1",
      key: "green",
      label: "Green",
      definitionId: "def-color",
      definitionKey: "color",
      definitionName: "Color",
    },
  ],
  preparations: [
    { id: "00000000-0000-4000-8000-0000000000b1", key: "chop", label: "Chop" },
  ],
  degreeKeys: ["fine", "light"],
  measurementModifierKeys: ["heaping", "packed"],
  instructionKeys: ["divided"],
};

function discovery(
  overrides: Partial<TeachDiscovery> &
    Pick<TeachDiscovery, "type" | "payload" | "title">
): TeachDiscovery {
  return {
    id: "d1",
    key: overrides.title,
    status: "OPEN",
    priority: 4.2,
    mentionCount: 3,
    distinctNoteCount: 2,
    concepts: [],
    entries: [],
    ...overrides,
  };
}

const search = vi.fn(async (query: string) =>
  [MILK, TOMATO].filter((concept) => concept.canonicalName.includes(query))
);

function view(status: ResolutionView["status"], text: string): ResolutionView {
  return {
    status,
    conceptId: null,
    conceptName: null,
    attributes: [],
    preparations: [],
    candidateCount: 0,
    score: null,
    text,
    highlights: [],
  };
}

function withNavigation(children: ReactNode, push = vi.fn()) {
  return <AppNavigationProvider push={push}>{children}</AppNavigationProvider>;
}

describe("decisionOptionsFor", () => {
  it("offers create, map, and reject for an unknown food, prefilled from suggested heads", () => {
    const options = decisionOptionsFor(
      discovery({
        type: "UNKNOWN_FOOD_PHRASE",
        title: "calamansi juice",
        payload: {
          type: "UNKNOWN_FOOD_PHRASE",
          phrase: "calamansi juice",
          headToken: "juice",
          suggestedHeadConceptIds: [TOMATO.id],
        },
        concepts: [TOMATO],
      }),
      vocabulary,
      search
    );
    expect(options.map((option) => option.key)).toEqual([
      "create",
      "map",
      "reject",
    ]);
    expect(initialPayload(options)).toEqual({
      type: "CREATE_CONCEPT",
      canonicalName: "calamansi juice",
      phrase: "calamansi juice",
      relationships: [
        { targetConceptId: TOMATO.id, relationshipType: "DERIVED_FROM" },
      ],
    });
    expect(initialPayload(options, 1)).toBeNull();
    expect(initialPayload(options, 2)).toEqual({
      type: "REJECT",
      reason: "Not useful",
    });
  });

  it("orders modifier roles by suggestion and guesses value keys", () => {
    const options = decisionOptionsFor(
      discovery({
        type: "UNKNOWN_MODIFIER",
        title: "loosely",
        payload: {
          type: "UNKNOWN_MODIFIER",
          token: "loosely",
          position: "PRE_HEAD",
          neighbors: ["packed"],
          suggestedRoles: ["DEGREE"],
          adjacentHeads: [{ conceptId: MILK.id, distinctNotes: 2 }],
        },
        concepts: [MILK],
      }),
      vocabulary,
      search
    );
    expect(options.map((option) => option.key)).toEqual([
      "degree",
      "measurement",
      "preparation",
      "attribute",
      "instruction",
      "ignore",
      "reject",
    ]);
    expect(initialPayload(options)).toEqual({
      type: "CLASSIFY_MODIFIER",
      token: "loosely",
      role: "DEGREE",
      valueKey: "loose",
    });
    expect(initialPayload(options, 2)).toEqual({
      type: "CLASSIFY_MODIFIER",
      token: "loosely",
      role: "PREPARATION",
      preparationId: vocabulary.preparations[0]?.id,
    });
    expect(initialPayload(options, 3)).toEqual({
      type: "CLASSIFY_MODIFIER",
      token: "loosely",
      role: "ATTRIBUTE",
      attributeValueId: vocabulary.attributeValues[0]?.id,
      applicableConceptIds: [MILK.id],
    });
    expect(initialPayload(options, 5)).toEqual({
      type: "IGNORE_TOKEN",
      token: "loosely",
    });
  });

  it("builds attribute, identity, ambiguity, relationship, and fallback options", () => {
    const entry = {
      id: "00000000-0000-4000-8000-0000000000e1",
      text: "green",
      role: "ATTRIBUTE",
      targetLabel: "color: green",
      conceptId: null,
      attributeValueId: vocabulary.attributeValues[0]?.id ?? null,
    };
    const attribute = decisionOptionsFor(
      discovery({
        type: "ATTRIBUTE_INTERPRETATION",
        title: "green with tomato",
        payload: {
          type: "ATTRIBUTE_INTERPRETATION",
          phrase: "green",
          entryIds: [entry.id],
          headConceptId: TOMATO.id,
        },
        concepts: [TOMATO],
        entries: [entry],
      }),
      vocabulary,
      search
    );
    expect(attribute[0]?.label).toBe('"green" means color: green for tomato');
    expect(initialPayload(attribute)).toMatchObject({
      type: "CLASSIFY_MODIFIER",
      role: "ATTRIBUTE",
      applicableConceptIds: [TOMATO.id],
    });

    const identity = decisionOptionsFor(
      discovery({
        type: "IDENTITY_DECISION",
        title: "green milk",
        payload: {
          type: "IDENTITY_DECISION",
          phrase: "green milk",
          modifierEntryIds: [entry.id],
          headConceptId: MILK.id,
          cooccurrence: 3,
        },
        concepts: [MILK],
        entries: [entry],
      }),
      vocabulary,
      search
    );
    expect(
      identity.map(
        (option) => initialPayload(identity, identity.indexOf(option))?.type
      )
    ).toEqual([
      "CONCEPT_PLUS_ATTRIBUTE",
      "CREATE_CONCEPT",
      "MAP_TO_CONCEPT",
      "REJECT",
    ]);
    expect(initialPayload(identity, 1)).toMatchObject({
      relationships: [{ targetConceptId: MILK.id, relationshipType: "IS_A" }],
      attributeValueIds: [entry.attributeValueId],
    });

    const foods = [
      {
        ...entry,
        id: "00000000-0000-4000-8000-0000000000f1",
        role: "FOOD",
        targetLabel: "milk",
        conceptId: MILK.id,
        attributeValueId: null,
      },
      {
        ...entry,
        id: "00000000-0000-4000-8000-0000000000f2",
        role: "FOOD",
        targetLabel: "tomato",
        conceptId: TOMATO.id,
        attributeValueId: null,
      },
    ];
    const ambiguous = decisionOptionsFor(
      discovery({
        type: "AMBIGUOUS_MATCH",
        title: "pepper",
        payload: {
          type: "AMBIGUOUS_MATCH",
          phrase: "pepper",
          entryIds: foods.map((food) => food.id),
        },
        entries: foods,
      }),
      vocabulary,
      search
    );
    expect(initialPayload(ambiguous)).toEqual({
      type: "MAP_TO_CONCEPT",
      phrase: "pepper",
      conceptId: MILK.id,
      kind: "ALIAS",
      exclusive: true,
    });
    expect(initialPayload(ambiguous, 2)).toEqual({
      type: "MARK_AMBIGUOUS",
      phrase: "pepper",
      entryIds: foods.map((food) => food.id),
    });

    const relationship = decisionOptionsFor(
      discovery({
        type: "RELATIONSHIP_SUGGESTION",
        title: "x",
        payload: {
          type: "RELATIONSHIP_SUGGESTION",
          sourceConceptId: TOMATO.id,
          targetConceptId: MILK.id,
          relationshipType: "PART_OF",
          evidence: "legacy",
        },
        concepts: [TOMATO, MILK],
      }),
      vocabulary,
      search
    );
    expect(initialPayload(relationship)).toEqual({
      type: "ADD_RELATIONSHIP",
      sourceConceptId: TOMATO.id,
      targetConceptId: MILK.id,
      relationshipType: "PART_OF",
    });

    const drift = decisionOptionsFor(
      discovery({
        type: "VERIFIED_DRIFT",
        title: "drift",
        payload: {
          type: "VERIFIED_DRIFT",
          mentionId: MILK.id,
          verifiedConceptId: null,
          proposedConceptId: null,
          parserVersion: "2",
          lastSeen: 1,
          lexiconRevision: 1,
        },
      }),
      vocabulary,
      search
    );
    expect(drift.map((option) => option.key)).toEqual(["reject"]);
  });
});

describe("HighlightedLine", () => {
  it("styles words by role, names the role for screen readers, and marks spans", () => {
    const { container } = render(
      <p>
        <HighlightedLine
          text="2 cups organic milk"
          tokens={[
            {
              span: { start: 7, end: 14, text: "organic" },
              kind: "UNKNOWN",
              roles: [],
              zone: "MAIN",
            },
            {
              span: { start: 15, end: 19, text: "milk" },
              kind: "LEXEME",
              roles: ["FOOD"],
              zone: "MAIN",
            },
          ]}
          marks={[{ start: 7, end: 14, text: "organic" }]}
        />
      </p>
    );
    expect(container.textContent).toBe("2 cups organic (unknown) milk (food)");
    expect(container.querySelector("mark")?.textContent).toBe(
      "organic (unknown)"
    );
    render(<RoleLegend />);
    expect(screen.getByLabelText("Highlight legend")).toHaveTextContent("food");
  });
});

describe("ImpactPreview", () => {
  const preview: DecisionPreview = {
    revision: 7,
    counts: {
      scanned: 3,
      affected: 2,
      newlyResolved: 1,
      conceptChanged: 1,
      attributesChanged: 0,
      becameAmbiguous: 1,
      becameUnresolved: 0,
      verifiedConflicts: 1,
    },
    examples: [
      {
        mentionId: "m1",
        noteId: "n1",
        noteTitle: "Pie",
        lineText: "2 tbsp icing sugar",
        before: view("UNRESOLVED", "unresolved: icing sugar"),
        after: view("AUTO_RESOLVED", "powdered sugar"),
        verifiedConflict: false,
      },
      {
        mentionId: "m2",
        noteId: null,
        noteTitle: null,
        lineText: "1 cup sugar",
        before: view("VERIFIED", "sugar"),
        after: view("AUTO_RESOLVED", "powdered sugar"),
        verifiedConflict: true,
      },
    ],
    truncated: true,
  };

  it("explains every state in a polite live region", () => {
    const { rerender, container } = render(
      <ImpactPreview preview={null} isLoading={false} error={null} />
    );
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent(
      "Choose an option"
    );
    rerender(<ImpactPreview preview={null} isLoading error={null} />);
    expect(screen.getByText("Working out the impact…")).toBeInTheDocument();
    rerender(
      <ImpactPreview preview={null} isLoading={false} error="Bad payload" />
    );
    expect(screen.getByText("Bad payload")).toBeInTheDocument();
    rerender(
      <ImpactPreview
        preview={{
          ...preview,
          counts: { ...preview.counts, affected: 0 },
          examples: [],
          truncated: false,
        }}
        isLoading={false}
        error={null}
      />
    );
    expect(screen.getByTestId("impact-summary")).toHaveTextContent(
      "No stored mentions change (3 mentions checked)."
    );

    rerender(
      <ImpactPreview preview={preview} isLoading={false} error={null} />
    );
    expect(screen.getByTestId("impact-summary")).toHaveTextContent(
      "2 mentions would change: 1 newly resolved, 1 with a different concept, 0 with different attributes. Only the first matches were checked."
    );
    expect(
      screen.getByText(/1 verified mention would read differently/)
    ).toBeInTheDocument();
    expect(
      screen.getByText("1 would become ambiguous and 0 unresolved.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Examples of the change" }).children
    ).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Pie" })).toHaveAttribute(
      "href",
      "/notes/n1"
    );
    expect(screen.getByText("verified, will not change")).toBeInTheDocument();
  });
});

describe("DiscoveryQueuePageContent", () => {
  it("lists discoveries with type filters and refreshes on demand", async () => {
    const onRefresh = vi.fn(async () => ({ success: true as const }));
    render(
      withNavigation(
        <DiscoveryQueuePageContent
          items={[
            discovery({
              type: "UNKNOWN_FOOD_PHRASE",
              title: "calamansi juice",
              payload: {},
            }),
          ]}
          counts={[
            { type: "UNKNOWN_FOOD_PHRASE", count: 1 },
            { type: "AMBIGUOUS_MATCH", count: 0 },
          ]}
          activeType="UNKNOWN_FOOD_PHRASE"
          nextCursor="d9"
          taughtMessage="Taught: x"
          onRefresh={onRefresh}
        />
      )
    );
    const filters = screen.getByRole("navigation", { name: "Discovery type" });
    expect(
      within(filters)
        .getAllByRole("link")
        .map((link) => link.textContent)
    ).toEqual(["All1", "Food vocabulary1"]);
    expect(
      within(filters).getByRole("link", { name: /Food vocabulary/ })
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: /calamansi juice/ })
    ).toHaveAttribute("href", "/teach/d1");
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute(
      "href",
      "/teach?type=UNKNOWN_FOOD_PHRASE&cursor=d9"
    );
    expect(screen.getByRole("status")).toHaveTextContent("Taught: x");
    fireEvent.click(
      screen.getByRole("button", { name: /Refresh discoveries/ })
    );
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });

  it("says when there is nothing to review", () => {
    render(
      withNavigation(
        <DiscoveryQueuePageContent
          items={[]}
          counts={[]}
          activeType={null}
          nextCursor={null}
        />
      )
    );
    expect(screen.getByText(/Nothing to review/)).toBeInTheDocument();
  });
});

describe("DiscoveryReviewPageContent", () => {
  const food = discovery({
    type: "UNKNOWN_FOOD_PHRASE",
    title: "icing sugar",
    mentionCount: 8,
    payload: {
      type: "UNKNOWN_FOOD_PHRASE",
      phrase: "icing sugar",
      headToken: "sugar",
    },
  });
  const preview: DecisionPreview = {
    revision: 2,
    counts: {
      scanned: 1,
      affected: 1,
      newlyResolved: 1,
      conceptChanged: 1,
      attributesChanged: 0,
      becameAmbiguous: 0,
      becameUnresolved: 0,
      verifiedConflicts: 0,
    },
    examples: [],
    truncated: false,
  };

  function renderCard(
    overrides: Partial<Parameters<typeof DiscoveryReviewPageContent>[0]> = {}
  ) {
    const push = vi.fn();
    const props = {
      discovery: food,
      examples: [
        {
          mentionId: "m1",
          noteId: "n1",
          noteTitle: "Lemon Bars",
          lineText: "2 tbsp icing sugar",
          span: { start: 7, end: 18, text: "icing sugar" },
        },
      ],
      vocabulary,
      previousId: "d0",
      nextId: "d2",
      onApplyDecision: vi.fn(async () => ({
        success: true as const,
        data: {
          summary: "Taught: icing sugar is powdered sugar",
          mentionsUpdated: 1,
          needsBackgroundReinterpret: false,
          reinterpretCommand: null,
        },
      })),
      onDefer: vi.fn(async () => ({ success: true as const })),
      onPreviewDecision: vi.fn(async () => preview),
      onSearchConcepts: search,
      onLoadExamples: vi.fn(async () => []),
      ...overrides,
    };
    render(withNavigation(<DiscoveryReviewPageContent {...props} />, push));
    return { push, props };
  }

  it("focuses the heading, previews the prefilled option, and applies it with Enter", async () => {
    const { push, props } = renderCard();
    expect(
      screen.getByRole("heading", { name: "icing sugar", level: 1 })
    ).toHaveFocus();
    await waitFor(
      () =>
        expect(screen.getByTestId("impact-summary")).toHaveTextContent(
          "1 mention would change"
        ),
      { timeout: 2000 }
    );
    expect(props.onPreviewDecision).toHaveBeenCalledWith(
      expect.objectContaining({ type: "CREATE_CONCEPT" })
    );

    fireEvent.keyDown(window, { key: "Enter" });
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        `/teach/d2?taught=${encodeURIComponent("Taught: icing sugar is powdered sugar; 1 mention updated")}`
      )
    );
    expect(props.onApplyDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CREATE_CONCEPT",
        canonicalName: "icing sugar",
      }),
      "d1"
    );
  });

  it("supports number, navigation, examples, and defer shortcuts", async () => {
    const { push, props } = renderCard({ nextId: null });
    fireEvent.keyDown(window, { key: "3" });
    expect(screen.getByRole("radio", { name: /Reject/ })).toBeChecked();
    fireEvent.keyDown(window, { key: "k" });
    expect(push).toHaveBeenCalledWith("/teach/d0");

    fireEvent.keyDown(window, { key: "e" });
    expect(
      await screen.findByRole("dialog", { name: /Examples of/ })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(props.onLoadExamples).toHaveBeenCalledWith(0, 20)
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );

    fireEvent.keyDown(window, { key: "d" });
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        `/teach?taught=${encodeURIComponent("Deferred “icing sugar”")}`
      )
    );
  });

  it("ignores shortcuts while typing, shows preview errors, and reports background reinterpretation", async () => {
    const { push } = renderCard({
      onPreviewDecision: vi.fn(async () => {
        throw new Error("Preview failed");
      }),
      onApplyDecision: vi.fn(async () => ({
        success: true as const,
        data: {
          summary: "Taught: x",
          mentionsUpdated: 0,
          needsBackgroundReinterpret: true,
          reinterpretCommand: "yarn reinterpret",
        },
      })),
    });
    expect(
      await screen.findByText("Preview failed", {}, { timeout: 2000 })
    ).toBeInTheDocument();
    const nameField = screen.getByLabelText("Concept name");
    fireEvent.keyDown(nameField, { key: "j" });
    expect(push).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.submit(nameField.closest("form") as HTMLFormElement);
    });
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        `/teach/d2?taught=${encodeURIComponent("Taught: x; many mentions are affected, run: yarn reinterpret")}`
      )
    );
  });
});

describe("PlaygroundPageContent", () => {
  it("shows each mention and simulates a decision", async () => {
    const push = vi.fn();
    const onPreviewDecision = vi.fn(async () => ({
      revision: 3,
      counts: {
        scanned: 0,
        affected: 0,
        newlyResolved: 0,
        conceptChanged: 0,
        attributesChanged: 0,
        becameAmbiguous: 0,
        becameUnresolved: 0,
        verifiedConflicts: 0,
      },
      examples: [],
      truncated: false,
    }));
    render(
      withNavigation(
        <PlaygroundPageContent
          line="2 cups organic milk"
          mode="CONSERVATIVE"
          result={{
            line: "2 cups organic milk",
            revision: 3,
            mode: "CONSERVATIVE",
            syntax: "[2 cup] organic {milk:FOOD}",
            alternativeCount: 1,
            mentions: [
              {
                segmentIndex: 0,
                partIndex: 1,
                span: { start: 0, end: 19, text: "2 cups organic milk" },
                status: "NEEDS_REVIEW",
                quantity: "2 cup",
                tokens: [],
                candidates: [
                  {
                    conceptId: MILK.id,
                    conceptName: "milk",
                    score: 0.42,
                    reasons: ["head:milk(1 token)"],
                    attributes: ["color:green"],
                    preparations: [],
                    modifiers: [],
                  },
                ],
                unresolved: [{ start: 7, end: 14, text: "organic" }],
                summary: {
                  ...view("NEEDS_REVIEW", "milk"),
                  preparations: ["chop (fine)"],
                },
              },
            ],
          }}
          onPreviewDecision={onPreviewDecision}
        />,
        push
      )
    );
    expect(screen.getByLabelText("Syntax summary")).toHaveTextContent(
      "[2 cup] organic {milk:FOOD}"
    );
    expect(screen.getByText("Segment 1, part 2")).toBeInTheDocument();
    expect(screen.getByText("head:milk(1 token)")).toBeInTheDocument();
    expect(
      screen.getByText("Lexicon revision 3 · 1 other segmentations considered")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Exploratory/ }));
    fireEvent.click(screen.getByRole("button", { name: "Read line" }));
    expect(push).toHaveBeenCalledWith(
      "/teach/playground?line=2+cups+organic+milk&mode=EXPLORATORY"
    );

    const payload = screen.getByLabelText(/Decision \(JSON/);
    fireEvent.change(payload, { target: { value: "{ not json" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview impact" }));
    expect(
      await screen.findByText("The decision must be valid JSON")
    ).toBeInTheDocument();
    fireEvent.change(payload, {
      target: { value: '{ "type": "IGNORE_TOKEN", "token": "organic" }' },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview impact" }));
    await waitFor(() =>
      expect(onPreviewDecision).toHaveBeenCalledWith({
        type: "IGNORE_TOKEN",
        token: "organic",
      })
    );
  });
});

describe("MentionPanel", () => {
  const mention: NoteMention = {
    id: "00000000-0000-4000-8000-0000000000c1",
    segmentIndex: 0,
    rawText: "1 cup raw milk",
    status: "NEEDS_REVIEW",
    concept: null,
    quantity: "1 cup",
    verified: false,
    summary: view("NEEDS_REVIEW", "milk"),
    tokens: [],
    candidates: [],
    unresolved: [{ start: 6, end: 9, text: "raw" }],
  };

  it("expands to the full reading and corrects the mention, optionally teaching the phrase", async () => {
    const onCorrectMention = vi.fn(async () => ({
      success: true as const,
      data: {
        summary: "Corrected to milk",
        mentionsUpdated: 0,
        needsBackgroundReinterpret: false,
        reinterpretCommand: null,
      },
    }));
    render(
      <MentionPanel
        lineText="1 cup raw milk"
        mentions={[mention]}
        onCorrectMention={onCorrectMention}
        onSearchConcepts={search}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Peas reads this as milk/ })
    );
    expect(screen.getByText("Not understood")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Correct" }));
    fireEvent.change(
      screen.getByRole("combobox", { name: "Correct concept" }),
      { target: { value: "milk" } }
    );
    fireEvent.mouseDown(
      await screen.findByRole("option", { name: "milk" }, { timeout: 2000 })
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Also teach/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save correction" }));

    await waitFor(() =>
      expect(onCorrectMention).toHaveBeenCalledWith(
        {
          type: "CORRECT_MENTION",
          mentionId: mention.id,
          conceptId: MILK.id,
          attributeValueIds: [],
          teachPhrase: "1 cup raw milk",
        },
        null
      )
    );
    expect(await screen.findByText("Corrected to milk")).toBeInTheDocument();
  });

  it("renders nothing without mentions", () => {
    const { container } = render(<MentionPanel lineText="x" mentions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
