import type { ReactNode } from "react";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppNavigationProvider } from "../../app-navigation";
import type { DecisionPreview } from "../../teach/types";
import { classificationKey, classificationLabel } from "../classification";
import { ConceptCard, conceptEditPayload } from "../concept-card";
import type { ConceptDetail } from "../types";

const CHICKEN = {
  id: "00000000-0000-4000-8000-000000000001",
  canonicalName: "chicken",
  status: "VERIFIED" as const,
};
const POULTRY = {
  id: "00000000-0000-4000-8000-000000000009",
  canonicalName: "poultry",
  status: "VERIFIED" as const,
};

const concept: ConceptDetail = {
  id: "00000000-0000-4000-8000-000000000002",
  slug: "chicken-thigh",
  canonicalName: "chicken thigh",
  status: "VERIFIED",
  description: null,
  isComposed: false,
  mergedInto: null,
  entries: [
    { id: "e1", text: "chicken thigh", kind: "CANONICAL", status: "ACTIVE" },
    { id: "e2", text: "chicken thighs", kind: "PLURAL", status: "ACTIVE" },
    { id: "e3", text: "thigh meat", kind: "ALIAS", status: "ACTIVE" },
  ],
  parents: [{ id: "r1", type: "PART_OF", status: "ACTIVE", concept: CHICKEN }],
  children: [],
  attributes: [],
  classifications: [
    {
      key: "VEGAN",
      kind: "DIETARY",
      value: "FALSE",
      source: "EXPLICIT",
      inheritedFrom: null,
      isExplicit: true,
    },
    {
      key: "MEAT",
      kind: "FOOD_GROUP",
      value: "TRUE",
      source: "INHERITED",
      inheritedFrom: CHICKEN,
      isExplicit: false,
    },
  ],
  tags: ["dark meat"],
  substitutions: [{ concept: CHICKEN, ratio: "1:1", note: null }],
  mentions: [],
  decisions: [],
};

function preview(affected: number): DecisionPreview {
  return {
    revision: 4,
    counts: {
      scanned: 5,
      affected,
      newlyResolved: 0,
      conceptChanged: affected,
      attributesChanged: 0,
      becameAmbiguous: 0,
      becameUnresolved: 0,
      verifiedConflicts: 0,
    },
    examples: [],
    truncated: false,
  };
}

const ok = { success: true as const };

function actions(affected = 0) {
  return {
    onApplyDecision: vi.fn(async () => ({
      success: true as const,
      data: {
        summary: "Updated chicken thigh",
        mentionsUpdated: affected,
        needsBackgroundReinterpret: false,
        reinterpretCommand: null,
      },
    })),
    onPreview: vi.fn(async () => preview(affected)),
    onSearchConcepts: vi.fn(async () => [CHICKEN, POULTRY]),
    onSetClassification: vi.fn(async () => ok),
    onRemoveClassification: vi.fn(async () => ok),
    onSetTags: vi.fn(async () => ok),
    onSetSubstitution: vi.fn(async () => ok),
    onRemoveSubstitution: vi.fn(async () => ok),
  };
}

function withNavigation(children: ReactNode) {
  return (
    <AppNavigationProvider push={vi.fn()}>{children}</AppNavigationProvider>
  );
}

afterEach(cleanup);

describe("conceptEditPayload", () => {
  const draft = {
    canonicalName: "chicken thigh",
    names: [
      { id: "e1", text: "chicken thigh", kind: "CANONICAL" as const },
      { id: "e2", text: "chicken thighs", kind: "PLURAL" as const },
      { id: "e3", text: "thigh meat", kind: "ALIAS" as const },
    ],
    parents: [
      {
        targetId: CHICKEN.id,
        targetName: "chicken",
        type: "PART_OF" as const,
        storedType: "PART_OF" as const,
      },
    ],
    classifications: [],
    tags: [],
    substitutions: [],
  };

  it("is null when names and relationships are unchanged", () => {
    expect(conceptEditPayload(concept, draft)).toBeNull();
  });

  it("renames by adding the new main name and demoting the old one, and swaps a relationship's type", () => {
    expect(
      conceptEditPayload(concept, {
        ...draft,
        canonicalName: "chicken leg",
        names: [
          ...draft.names.filter((name) => name.id !== "e3"),
          { id: null, text: "cuisse", kind: "REGIONAL" },
        ],
        parents: [{ ...draft.parents[0]!, type: "IS_A" }],
      })
    ).toEqual({
      type: "EDIT_CONCEPT",
      conceptId: concept.id,
      canonicalName: "chicken leg",
      addNames: [
        { text: "cuisse", kind: "REGIONAL" },
        { text: "chicken leg", kind: "CANONICAL" },
      ],
      setNameKinds: [{ entryId: "e1", kind: "ALIAS" }],
      retireEntryIds: ["e3"],
      addRelationships: [
        { targetConceptId: CHICKEN.id, relationshipType: "IS_A" },
      ],
      retireRelationships: [
        { targetConceptId: CHICKEN.id, relationshipType: "PART_OF" },
      ],
    });
  });

  it("promotes an existing name when renaming to it", () => {
    expect(
      conceptEditPayload(concept, { ...draft, canonicalName: "thigh meat" })
    ).toEqual({
      type: "EDIT_CONCEPT",
      conceptId: concept.id,
      canonicalName: "thigh meat",
      setNameKinds: [
        { entryId: "e1", kind: "ALIAS" },
        { entryId: "e3", kind: "CANONICAL" },
      ],
    });
  });
});

describe("classification keys", () => {
  it("prefixes categories and snake-cases everything else", () => {
    expect(classificationKey("CATEGORY", "  Baking   Spices ")).toBe(
      "CATEGORY:Baking Spices"
    );
    expect(classificationKey("DIETARY", "gluten free")).toBe("GLUTEN_FREE");
    expect(classificationKey("ALLERGEN", "tree-nut")).toBe("TREE_NUT");
    expect(classificationKey("DIETARY", "   ")).toBe("");
    expect(classificationLabel("CATEGORY:Spices")).toBe("Spices");
    expect(classificationLabel("GLUTEN_FREE")).toBe("gluten free");
  });
});

describe("ConceptCard", () => {
  it("is read-only without decision actions", () => {
    render(withNavigation(<ConceptCard concept={concept} />));
    expect(screen.getByText("chicken thigh is part of")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit chicken thigh" })
    ).not.toBeInTheDocument();
  });

  it("edits in one mode and saves one previewed decision plus direct writes", async () => {
    const props = actions();
    render(withNavigation(<ConceptCard concept={concept} {...props} />));
    fireEvent.click(screen.getByRole("button", { name: "Edit chicken thigh" }));

    const form = screen.getByRole("form", { name: "Edit chicken thigh" });
    fireEvent.change(
      within(form).getByRole("combobox", {
        name: "How chicken thigh relates to chicken",
      }),
      { target: { value: "IS_A" } }
    );
    fireEvent.click(
      within(form).getByRole("button", { name: "Remove the name thigh meat" })
    );
    fireEvent.change(
      within(form).getByRole("combobox", { name: "Value of vegan" }),
      { target: { value: "UNKNOWN" } }
    );
    fireEvent.click(
      within(form).getByRole("button", {
        name: "Remove the substitute chicken",
      })
    );
    expect(
      within(form).getByText(/meat: yes \(inherited from chicken\)/)
    ).toBeInTheDocument();

    fireEvent.click(within(form).getByRole("button", { name: "Save" }));
    const payload = {
      type: "EDIT_CONCEPT",
      conceptId: concept.id,
      retireEntryIds: ["e3"],
      addRelationships: [
        { targetConceptId: CHICKEN.id, relationshipType: "IS_A" },
      ],
      retireRelationships: [
        { targetConceptId: CHICKEN.id, relationshipType: "PART_OF" },
      ],
    };
    await waitFor(() =>
      expect(props.onApplyDecision).toHaveBeenCalledWith(payload, null)
    );
    expect(props.onPreview).toHaveBeenCalledWith(payload);
    await waitFor(() =>
      expect(props.onSetClassification).toHaveBeenCalledWith({
        key: "VEGAN",
        kind: "DIETARY",
        value: "UNKNOWN",
        note: null,
      })
    );
    await waitFor(() =>
      expect(props.onRemoveSubstitution).toHaveBeenCalledWith(CHICKEN.id)
    );
    expect(props.onSetTags).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Updated chicken thigh"
    );
  });

  it("adds names, broader concepts, classifications, tags, and substitutes, and Cancel discards everything", async () => {
    const props = actions();
    render(withNavigation(<ConceptCard concept={concept} {...props} />));
    fireEvent.click(screen.getByRole("button", { name: "Edit chicken thigh" }));
    let form = screen.getByRole("form", { name: "Edit chicken thigh" });

    fireEvent.click(within(form).getByRole("button", { name: "Add a name" }));
    fireEvent.change(within(form).getByRole("textbox", { name: "New name" }), {
      target: { value: "cuisse" },
    });
    fireEvent.keyDown(within(form).getByRole("textbox", { name: "New name" }), {
      key: "Enter",
    });
    expect(within(form).getByRole("list", { name: "Names" })).toHaveTextContent(
      "cuisse"
    );

    fireEvent.click(
      within(form).getByRole("button", { name: "Add a broader concept" })
    );
    fireEvent.change(
      within(form).getByRole("combobox", { name: "Broader concept" }),
      { target: { value: "poul" } }
    );
    fireEvent.mouseDown(
      await screen.findByRole("option", { name: "poultry" }, { timeout: 2000 })
    );
    expect(
      within(form).getByRole("list", { name: "More general" })
    ).toHaveTextContent("poultry");

    fireEvent.click(
      within(form).getByRole("button", { name: "Add a classification" })
    );
    fireEvent.change(
      within(form).getByRole("textbox", { name: "Classification name" }),
      { target: { value: "high protein" } }
    );
    fireEvent.click(
      within(form).getByRole("button", { name: "Add classification" })
    );
    expect(
      within(form).getByRole("list", { name: "Classifications" })
    ).toHaveTextContent("high protein");

    fireEvent.click(within(form).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(props.onApplyDecision).not.toHaveBeenCalled();
    expect(props.onSetClassification).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Edit chicken thigh" }));
    form = screen.getByRole("form", { name: "Edit chicken thigh" });
    expect(
      within(form).getByRole("list", { name: "Names" })
    ).not.toHaveTextContent("cuisse");
  });

  it("asks before saving a change that rereads stored mentions, and saves nothing when cancelled", async () => {
    const props = actions(2);
    render(withNavigation(<ConceptCard concept={concept} {...props} />));
    fireEvent.click(screen.getByRole("button", { name: "Edit chicken thigh" }));
    const form = screen.getByRole("form", { name: "Edit chicken thigh" });
    fireEvent.change(within(form).getByLabelText("Main name"), {
      target: { value: "chicken leg" },
    });

    fireEvent.click(within(form).getByRole("button", { name: "Save" }));
    let dialog = await screen.findByRole("dialog", {
      name: "This changes how 2 mentions read",
    });
    expect(within(dialog).getByTestId("impact-summary")).toHaveTextContent(
      "2 mentions would change"
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(props.onApplyDecision).not.toHaveBeenCalled();

    fireEvent.click(within(form).getByRole("button", { name: "Save" }));
    dialog = await screen.findByRole("dialog", {
      name: "This changes how 2 mentions read",
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save and update lines" })
    );
    await waitFor(() =>
      expect(props.onApplyDecision).toHaveBeenCalledWith(
        expect.objectContaining({ canonicalName: "chicken leg" }),
        null
      )
    );
  });

  it("shows a failed save and stays in edit mode", async () => {
    const props = actions();
    props.onSetTags.mockResolvedValueOnce({
      success: false,
      message: "Tags are full",
    } as never);
    render(withNavigation(<ConceptCard concept={concept} {...props} />));
    fireEvent.click(screen.getByRole("button", { name: "Edit chicken thigh" }));
    const form = screen.getByRole("form", { name: "Edit chicken thigh" });
    fireEvent.click(
      within(form).getByRole("button", { name: "Remove dark meat" })
    );
    fireEvent.click(within(form).getByRole("button", { name: "Save" }));
    expect(await within(form).findByText("Tags are full")).toBeInTheDocument();
    expect(props.onSetTags).toHaveBeenCalledWith([]);
    expect(props.onApplyDecision).not.toHaveBeenCalled();
  });
});
