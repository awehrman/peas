import type { ReactNode } from "react";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { AppNavigationProvider } from "../../../app-navigation";
import type { IngredientDetail, IngredientOption } from "../../types";
import {
  type CheckIngredientName,
  IngredientCard,
  type SaveIngredient,
} from "../ingredient-card";

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

function withNavigation(children: ReactNode) {
  return (
    <AppNavigationProvider push={vi.fn()}>{children}</AppNavigationProvider>
  );
}

const TOMATO = { id: "00000000-0000-4000-8000-000000000001", name: "tomato" };
const CANNED = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "canned tomatoes",
};
const PASTE = {
  id: "00000000-0000-4000-8000-000000000003",
  name: "tomato paste",
};
const CHERRY = {
  id: "00000000-0000-4000-8000-000000000004",
  name: "cherry tomato",
};

const canned: IngredientDetail = {
  id: CANNED.id,
  name: "canned tomatoes",
  plural: null,
  isReviewed: false,
  reviewedAt: null,
  isComposedIngredient: true,
  propertyStates: [
    {
      property: "VEGETABLE",
      explicit: null,
      inherited: "TRUE",
      inheritedFrom: TOMATO,
    },
  ],
  dietaryTags: ["VEGAN", "VEGETARIAN", "GLUTEN_FREE"],
  aliases: [],
  substitutions: [],
  relationships: [{ relationshipType: "PROCESSED_FROM", ingredient: TOMATO }],
  variants: [],
  categories: ["pantry"],
  tags: ["staple"],
  referenceCount: 2,
  references: [
    { id: "r1", reference: "1 can tomatoes", noteId: "n1", noteTitle: "Sauce" },
  ],
};

const tomato: IngredientDetail = {
  ...canned,
  id: TOMATO.id,
  name: "tomato",
  plural: "tomatoes",
  isReviewed: true,
  isComposedIngredient: false,
  propertyStates: [
    {
      property: "VEGETABLE",
      explicit: "TRUE",
      inherited: null,
      inheritedFrom: null,
    },
  ],
  relationships: [],
  categories: [],
  tags: [],
  referenceCount: 0,
  references: [],
  variants: [
    { relationshipType: "IS_A", ingredient: CHERRY },
    { relationshipType: "PROCESSED_FROM", ingredient: CANNED },
    { relationshipType: "PROCESSED_FROM", ingredient: PASTE },
  ],
};

function renderCard(
  ingredient: IngredientDetail,
  {
    isReviewQueue = true,
    onSave = vi.fn<SaveIngredient>(async () => ({
      success: true,
      data: { nextId: null },
    })),
    onCheckName,
    search = [],
  }: {
    isReviewQueue?: boolean;
    onSave?: SaveIngredient;
    onCheckName?: CheckIngredientName;
    search?: IngredientOption[];
  } = {}
) {
  render(
    withNavigation(
      <IngredientCard
        ingredient={ingredient}
        categoryOptions={["pantry", "produce"]}
        isReviewQueue={isReviewQueue}
        onSave={onSave}
        onCheckName={onCheckName}
        onSearch={vi.fn(async () => search)}
      />
    )
  );
  return { onSave };
}

/** The automatic tags shown in the Tags field while editing. */
function autoTags(): string[] {
  const list = screen.queryByRole("list", { name: "Tags added automatically" });
  return list
    ? within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent ?? "")
    : [];
}

describe("IngredientCard view mode", () => {
  it("shows only what is filled in, with no plus buttons, and switches to editing", () => {
    renderCard(canned, { isReviewQueue: false });
    expect(
      screen.getByRole("heading", { name: "canned tomatoes", level: 2 })
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Add / })).toBeNull();
    expect(screen.queryByText("Substitutes")).toBeNull();
    expect(screen.queryByText("Alternate names")).toBeNull();

    expect(
      within(screen.getByRole("list", { name: "Base ingredients" })).getByRole(
        "listitem"
      )
    ).toHaveTextContent("canned tomatoes is processed from tomato");
    expect(screen.getByRole("list", { name: "Core type" })).toHaveTextContent(
      "Vegetable (from tomato)"
    );
    expect(screen.queryByRole("list", { name: "Allergens" })).toBeNull();
    expect(
      within(screen.getByRole("list", { name: "Tags" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent)
    ).toEqual(["vegan", "vegetarian", "gluten-free", "staple"]);
    expect(screen.getByRole("list", { name: "Categories" })).toHaveTextContent(
      "pantry"
    );
    expect(screen.getByText("Composed ingredient")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Edit canned tomatoes" })
    );
    expect(screen.getByLabelText("Name", { exact: true })).toHaveValue(
      "canned tomatoes"
    );
  });

  it("throws away changes on cancel, and returns to the view after saving", async () => {
    const { onSave } = renderCard(tomato, { isReviewQueue: false });
    fireEvent.click(screen.getByRole("button", { name: "Edit tomato" }));
    fireEvent.change(screen.getByLabelText("Name", { exact: true }), {
      target: { value: "roma tomato" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "tomato, tomatoes"
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit tomato" }));
    expect(screen.getByLabelText("Name", { exact: true })).toHaveValue(
      "tomato"
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("status")).toHaveTextContent("Saved");
    expect(
      screen.getByRole("button", { name: "Edit tomato" })
    ).toBeInTheDocument();
  });

  it("opens in edit mode in the review queue, where cancel resets the form", () => {
    renderCard(canned);
    const nameField = screen.getByLabelText("Name", { exact: true });
    fireEvent.change(nameField, { target: { value: "tinned tomatoes" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByLabelText("Name", { exact: true })).toHaveValue(
      "canned tomatoes"
    );
  });
});

describe("IngredientCard edit mode", () => {
  it("groups a base food's variants and keeps list fields behind plus buttons", async () => {
    renderCard(tomato);
    const processed = screen.getByRole("list", {
      name: "Processed from tomato",
    });
    expect(
      within(processed)
        .getAllByRole("link")
        .map((link) => link.textContent)
    ).toEqual(["canned tomatoes", "tomato paste"]);
    expect(
      screen.queryByRole("textbox", { name: "Alternate names" })
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Add an alternate name" })
    );
    const aliases = screen.getByRole("textbox", { name: "Alternate names" });
    expect(aliases).toHaveFocus();
    fireEvent.blur(aliases);
    await waitFor(() =>
      expect(
        screen.queryByRole("textbox", { name: "Alternate names" })
      ).toBeNull()
    );
    expect(
      screen.getByRole("button", { name: "Add a substitute" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add a category" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add a tag" })
    ).toBeInTheDocument();
  });

  it("refuses an alternate name that another ingredient or this one already uses", async () => {
    const onCheckName = vi.fn<CheckIngredientName>(async (name) =>
      name === "passata" ? { id: PASTE.id, name: "tomato paste" } : null
    );
    renderCard(tomato, { onCheckName });
    fireEvent.click(
      screen.getByRole("button", { name: "Add an alternate name" })
    );
    const aliases = screen.getByRole("textbox", { name: "Alternate names" });

    fireEvent.change(aliases, { target: { value: "passata" } });
    fireEvent.keyDown(aliases, { key: "Enter" });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "“passata” is already a name of tomato paste"
    );
    expect(onCheckName).toHaveBeenCalledWith("passata", TOMATO.id);
    expect(aliases).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(aliases, { target: { value: "Tomatoes" } });
    fireEvent.keyDown(aliases, { key: "Enter" });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "already this ingredient's name"
    );

    fireEvent.change(aliases, { target: { value: "love apple" } });
    fireEvent.keyDown(aliases, { key: "Enter" });
    await waitFor(() =>
      expect(
        screen.getByRole("list", { name: "Alternate names" })
      ).toHaveTextContent("love apple")
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("adds a base ingredient only with a relationship and an existing ingredient, and removes it", async () => {
    const { onSave } = renderCard(
      { ...canned, relationships: [] },
      { search: [TOMATO, CHERRY] }
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Add a base ingredient" })
    );
    const adder = screen.getByRole("group", { name: "New base ingredient" });
    expect(within(adder).getByLabelText("Relationship")).toHaveFocus();
    expect(
      within(adder).queryByRole("option", { name: /as a new ingredient/ })
    ).toBeNull();

    fireEvent.click(
      within(adder).getByRole("button", { name: "Add base ingredient" })
    );
    expect(within(adder).getByRole("alert")).toHaveTextContent(
      "Choose how canned tomatoes relates"
    );
    fireEvent.change(within(adder).getByLabelText("Relationship"), {
      target: { value: "PROCESSED_FROM" },
    });
    fireEvent.click(
      within(adder).getByRole("button", { name: "Add base ingredient" })
    );
    expect(within(adder).getByRole("alert")).toHaveTextContent(
      "Choose an existing ingredient"
    );

    fireEvent.change(
      within(adder).getByRole("combobox", { name: "Base ingredient" }),
      {
        target: { value: "tom" },
      }
    );
    fireEvent.mouseDown(
      await within(adder).findByRole("option", { name: "tomato" })
    );
    fireEvent.click(
      within(adder).getByRole("button", { name: "Add base ingredient" })
    );

    expect(
      screen.queryByRole("group", { name: "New base ingredient" })
    ).toBeNull();
    expect(
      screen.getByLabelText("How canned tomatoes relates to tomato")
    ).toHaveValue("PROCESSED_FROM");

    fireEvent.click(
      screen.getByRole("button", { name: "Add a base ingredient" })
    );
    fireEvent.click(
      within(
        screen.getByRole("group", { name: "New base ingredient" })
      ).getByRole("button", {
        name: "Cancel",
      })
    );
    expect(
      screen.queryByRole("group", { name: "New base ingredient" })
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(vi.mocked(onSave).mock.calls[0]![0]).toMatchObject({
      relationships: [
        { ingredientId: TOMATO.id, relationshipType: "PROCESSED_FROM" },
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove tomato" }));
    expect(
      screen.queryByLabelText("How canned tomatoes relates to tomato")
    ).toBeNull();
  });

  it("offers the five closest existing ingredients as substitutes, and removes them", async () => {
    const matches = Array.from({ length: 7 }, (_, index) => ({
      id: `00000000-0000-4000-8000-00000000010${index}`,
      name: `tomato ${index + 1}`,
    }));
    renderCard(canned, { search: matches });
    fireEvent.click(screen.getByRole("button", { name: "Add a substitute" }));
    fireEvent.change(
      screen.getByRole("combobox", { name: "Add a substitute" }),
      {
        target: { value: "tom" },
      }
    );
    const listbox = await screen.findByRole("listbox", {
      name: "Add a substitute suggestions",
    });
    await waitFor(() =>
      expect(within(listbox).getAllByRole("option")).toHaveLength(5)
    );
    expect(
      within(listbox).queryByRole("option", { name: /as a new ingredient/ })
    ).toBeNull();

    fireEvent.mouseDown(
      within(listbox).getByRole("option", { name: "tomato 2" })
    );
    expect(screen.getByRole("list", { name: "Substitutes" })).toHaveTextContent(
      "tomato 2"
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove tomato 2" }));
    expect(screen.queryByRole("list", { name: "Substitutes" })).toBeNull();
  });

  it("adds and removes categories and tags", async () => {
    const { onSave } = renderCard(canned);
    fireEvent.click(screen.getByRole("button", { name: "Add a category" }));
    const categories = screen.getByRole("combobox", { name: "Categories" });
    expect(categories).toHaveAttribute("placeholder", "add category");
    fireEvent.change(categories, { target: { value: "produce" } });
    fireEvent.keyDown(categories, { key: "Enter" });
    await waitFor(() =>
      expect(
        screen.getByRole("list", { name: "Categories" })
      ).toHaveTextContent("produce")
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove pantry" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove staple" }));

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(vi.mocked(onSave).mock.calls[0]![0]).toMatchObject({
      categories: ["produce"],
      tags: [],
    });
  });

  it('shows inherited properties, and saves a "does not contain" override', async () => {
    const { onSave } = renderCard({ ...canned, relationships: [] });
    const vegetable = screen.getByRole("checkbox", { name: "Vegetable" });
    expect(vegetable).toBeChecked();
    expect(vegetable).toHaveAccessibleDescription("(from tomato)");
    expect(autoTags()).toEqual(["vegan", "vegetarian", "gluten-free"]);

    fireEvent.click(vegetable);
    expect(vegetable).not.toBeChecked();
    expect(vegetable).toHaveAccessibleDescription("(not, unlike tomato)");
    expect(autoTags()).toEqual([]);

    fireEvent.click(screen.getByRole("checkbox", { name: "Dairy" }));
    expect(autoTags()).toEqual(["vegetarian", "gluten-free"]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Gluten" }));
    expect(autoTags()).toEqual(["vegetarian"]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Gluten" }));

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(vi.mocked(onSave).mock.calls[0]![0]).toMatchObject({
      properties: ["DAIRY"],
      excludedProperties: ["VEGETABLE"],
    });
  });

  it("marks a food made or processed from another as composed, and reports save errors", async () => {
    const onSave = vi.fn<SaveIngredient>(async () => ({
      success: false,
      message: "That name is already used",
    }));
    renderCard({ ...canned, isComposedIngredient: false }, { onSave });
    const composed = screen.getByRole("checkbox", {
      name: /Composed ingredient/,
    });
    expect(composed).toBeChecked();
    expect(composed).toBeDisabled();
    expect(composed).toHaveAccessibleDescription("(is processed from tomato)");

    const relation = screen.getByLabelText(
      "How canned tomatoes relates to tomato"
    );
    fireEvent.change(relation, { target: { value: "IS_A" } });
    expect(composed).not.toBeChecked();
    expect(composed).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Save and next" }));
    expect(
      await screen.findByText("That name is already used")
    ).toBeInTheDocument();
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      isComposedIngredient: false,
      advanceToNext: true,
    });
    cleanup();
  });
});
