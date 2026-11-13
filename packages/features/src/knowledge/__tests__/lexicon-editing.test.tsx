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
import type { DecisionPreview, TeachVocabulary } from "../../teach/types";
import {
  type LexiconEditing,
  editEntryPayload,
  newEntryPayload,
} from "../entry-editor";
import { LexiconPageContent, type LexiconPageData } from "../lexicon-list";

const THIGH_ID = "00000000-0000-4000-8000-000000000010";
const LEG_ID = "00000000-0000-4000-8000-000000000011";
const GREEN = "00000000-0000-4000-8000-0000000000a1";
const UNRIPE = "00000000-0000-4000-8000-0000000000a2";
const CHOP = "00000000-0000-4000-8000-0000000000b1";

const vocabulary: TeachVocabulary = {
  definitions: [],
  attributeValues: [
    {
      id: GREEN,
      key: "green",
      label: "Green",
      definitionId: "d1",
      definitionKey: "color",
      definitionName: "Color",
    },
    {
      id: UNRIPE,
      key: "unripe",
      label: "Unripe",
      definitionId: "d2",
      definitionKey: "ripeness",
      definitionName: "Ripeness",
    },
  ],
  preparations: [{ id: CHOP, key: "chop", label: "chop" }],
  degreeKeys: ["fine", "rough"],
  measurementModifierKeys: ["heaping"],
  instructionKeys: ["divided"],
};

const page: LexiconPageData = {
  items: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      text: "chicken thighs",
      role: "FOOD",
      kind: "PLURAL",
      status: "ACTIVE",
      targetLabel: "chicken thigh",
      conceptId: THIGH_ID,
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      text: "green",
      role: "ATTRIBUTE",
      kind: null,
      status: "ACTIVE",
      targetLabel: "color: green",
      conceptId: null,
      attributeValueId: GREEN,
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      text: "finely",
      role: "DEGREE",
      kind: null,
      status: "DEPRECATED",
      targetLabel: "fine",
      conceptId: null,
      valueKey: "fine",
    },
  ],
  total: 3,
  page: 1,
  pageSize: 50,
};

function preview(affected: number): DecisionPreview {
  return {
    revision: 3,
    counts: {
      scanned: 4,
      affected,
      newlyResolved: 0,
      conceptChanged: 0,
      attributesChanged: affected,
      becameAmbiguous: 0,
      becameUnresolved: 0,
      verifiedConflicts: 0,
    },
    examples: [],
    truncated: false,
  };
}

function editing(affected = 0) {
  return {
    vocabulary,
    onApplyDecision: vi.fn(async () => ({
      success: true as const,
      data: {
        summary: "Updated “green”",
        mentionsUpdated: affected,
        needsBackgroundReinterpret: false,
        reinterpretCommand: null,
      },
    })),
    onPreview: vi.fn(async () => preview(affected)),
    onSearchConcepts: vi.fn(async () => [
      { id: LEG_ID, canonicalName: "chicken leg", status: "VERIFIED" as const },
    ]),
  } satisfies LexiconEditing;
}

function renderPage(actions: LexiconEditing, includeRetired = false) {
  return render(
    (
      <AppNavigationProvider push={vi.fn()}>
        <LexiconPageContent
          data={page}
          role={null}
          includeRetired={includeRetired}
          editing={actions}
        />
      </AppNavigationProvider>
    ) as ReactNode
  );
}

afterEach(cleanup);

describe("entry decisions", () => {
  it("builds EDIT_ENTRY with only the role's target, and adds foods and modifiers with the matching decision", () => {
    const draft = {
      text: " finely ",
      role: "DEGREE" as const,
      target: "fine",
      targetLabel: "",
      kind: "ALIAS" as const,
      status: "DEPRECATED" as const,
    };
    expect(editEntryPayload("e1", draft)).toEqual({
      type: "EDIT_ENTRY",
      entryId: "e1",
      text: "finely",
      role: "DEGREE",
      status: "DEPRECATED",
      valueKey: "fine",
    });
    expect(
      newEntryPayload({
        ...draft,
        role: "FOOD",
        target: THIGH_ID,
        kind: "REGIONAL",
      })
    ).toEqual({
      type: "MAP_TO_CONCEPT",
      phrase: "finely",
      conceptId: THIGH_ID,
      kind: "REGIONAL",
    });
    expect(
      newEntryPayload({ ...draft, role: "PREPARATION", target: CHOP })
    ).toEqual({
      type: "CLASSIFY_MODIFIER",
      token: "finely",
      role: "PREPARATION",
      preparationId: CHOP,
    });
  });
});

describe("LexiconPageContent editing", () => {
  it("stays read-only without editing actions", () => {
    render(
      <AppNavigationProvider push={vi.fn()}>
        <LexiconPageContent data={page} role={null} />
      </AppNavigationProvider>
    );
    expect(
      screen.queryByRole("button", { name: /^Edit / })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add entry" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Show retired" })).toHaveAttribute(
      "href",
      "/lexicon?retired=1"
    );
  });

  it("repoints an entry from its row and saves straight away when no mention changes", async () => {
    const actions = editing();
    renderPage(actions);
    fireEvent.click(
      screen.getByRole("button", { name: "Edit green (attribute)" })
    );
    const form = screen.getByRole("form", { name: "Edit “green”" });
    fireEvent.change(within(form).getByRole("combobox", { name: "Meaning" }), {
      target: { value: UNRIPE },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Save" }));
    const payload = {
      type: "EDIT_ENTRY",
      entryId: page.items[1]!.id,
      text: "green",
      role: "ATTRIBUTE",
      status: "ACTIVE",
      attributeValueId: UNRIPE,
    };
    await waitFor(() =>
      expect(actions.onApplyDecision).toHaveBeenCalledWith(payload, null)
    );
    expect(actions.onPreview).toHaveBeenCalledWith(payload);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Updated “green”"
    );
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("asks before retiring an entry that changes stored mentions, and restores a retired one", async () => {
    const actions = editing(3);
    renderPage(actions, true);
    expect(screen.getByText("retired")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hide retired" })).toHaveAttribute(
      "href",
      "/lexicon"
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Edit chicken thighs (food)" })
    );
    const form = screen.getByRole("form", { name: "Edit “chicken thighs”" });
    expect(within(form).getByText("chicken thigh")).toBeInTheDocument();
    fireEvent.change(within(form).getByRole("combobox", { name: "Status" }), {
      target: { value: "DEPRECATED" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Save" }));
    const dialog = await screen.findByRole("dialog", {
      name: "This changes how 3 mentions read",
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save and update lines" })
    );
    await waitFor(() =>
      expect(actions.onApplyDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "EDIT_ENTRY",
          status: "DEPRECATED",
          conceptId: THIGH_ID,
          kind: "PLURAL",
        }),
        null
      )
    );
  });

  it("repoints a food name to another concept through the food picker", async () => {
    const actions = editing();
    renderPage(actions);
    fireEvent.click(
      screen.getByRole("button", { name: "Edit chicken thighs (food)" })
    );
    const form = screen.getByRole("form", { name: "Edit “chicken thighs”" });
    fireEvent.click(
      within(form).getByRole("button", {
        name: "Change the food (now chicken thigh)",
      })
    );
    expect(within(form).getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.change(within(form).getByRole("combobox", { name: "Food" }), {
      target: { value: "leg" },
    });
    fireEvent.mouseDown(
      await screen.findByRole(
        "option",
        { name: "chicken leg" },
        { timeout: 2000 }
      )
    );
    fireEvent.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(actions.onApplyDecision).toHaveBeenCalledWith(
        expect.objectContaining({ conceptId: LEG_ID }),
        null
      )
    );
  });

  it("adds a new modifier entry and cancels without saving", async () => {
    const actions = editing();
    renderPage(actions);
    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));
    let form = screen.getByRole("form", { name: "New lexicon entry" });
    fireEvent.click(within(form).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(actions.onApplyDecision).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));
    form = screen.getByRole("form", { name: "New lexicon entry" });
    expect(
      within(form).queryByRole("combobox", { name: "Status" })
    ).not.toBeInTheDocument();
    fireEvent.change(within(form).getByRole("textbox", { name: "Text" }), {
      target: { value: "roughly" },
    });
    fireEvent.change(within(form).getByRole("combobox", { name: "Role" }), {
      target: { value: "DEGREE" },
    });
    fireEvent.change(within(form).getByRole("combobox", { name: "Meaning" }), {
      target: { value: "rough" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Add entry" }));
    await waitFor(() =>
      expect(actions.onApplyDecision).toHaveBeenCalledWith(
        {
          type: "CLASSIFY_MODIFIER",
          token: "roughly",
          role: "DEGREE",
          valueKey: "rough",
        },
        null
      )
    );
  });
});
