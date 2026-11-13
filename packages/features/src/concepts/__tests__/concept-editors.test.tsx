import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppNavigationProvider } from "../../app-navigation";
import type { ConceptRef } from "../../teach/types";
import {
  ClassificationEditor,
  SubstitutionEditor,
  TagEditor,
  classificationKey,
  classificationLabel,
} from "../concept-editors";
import type { ConceptClassificationRow } from "../types";

const YOGURT: ConceptRef = {
  id: "00000000-0000-4000-8000-000000000010",
  canonicalName: "plain yogurt",
  status: "VERIFIED",
};
const MILK: ConceptRef = {
  id: "00000000-0000-4000-8000-000000000011",
  canonicalName: "milk",
  status: "VERIFIED",
};

function withNavigation(node: ReactNode) {
  return <AppNavigationProvider push={vi.fn()}>{node}</AppNavigationProvider>;
}

const ok = { success: true as const };

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

describe("ClassificationEditor", () => {
  const rows: ConceptClassificationRow[] = [
    {
      key: "VEGAN",
      kind: "DIETARY",
      value: "TRUE",
      source: "EXPLICIT",
      inheritedFrom: null,
      isExplicit: true,
    },
    {
      key: "DAIRY",
      kind: "FOOD_GROUP",
      value: "FALSE",
      source: "INHERITED",
      inheritedFrom: MILK,
      isExplicit: false,
    },
  ];

  it("sets a category and removes only explicit values", async () => {
    const onSetClassification = vi.fn(async () => ok);
    const onRemoveClassification = vi.fn(async () => ok);
    render(
      withNavigation(
        <ClassificationEditor
          classifications={rows}
          onSetClassification={onSetClassification}
          onRemoveClassification={onRemoveClassification}
        />
      )
    );

    expect(screen.getByRole("link", { name: "milk" })).toHaveAttribute(
      "href",
      `/concepts/${MILK.id}`
    );
    expect(
      screen.queryByRole("button", { name: "Remove dairy" })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove vegan" }));
    await waitFor(() =>
      expect(onRemoveClassification).toHaveBeenCalledWith("VEGAN")
    );
    expect(await screen.findByText("Removed vegan")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Kind"), {
      target: { value: "CATEGORY" },
    });
    fireEvent.change(screen.getByLabelText("Category name"), {
      target: { value: "Spices" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save classification" })
    );
    await waitFor(() =>
      expect(onSetClassification).toHaveBeenCalledWith({
        kind: "CATEGORY",
        key: "CATEGORY:Spices",
        value: "TRUE",
        note: null,
      })
    );
    expect(await screen.findByText("Set Spices to yes")).toBeInTheDocument();
  });

  it("shows failures and stays read-only without actions", async () => {
    const { rerender } = render(
      withNavigation(
        <ClassificationEditor
          classifications={rows}
          onSetClassification={vi.fn(async () => ({
            success: false as const,
            message: "key: Key is required",
          }))}
        />
      )
    );
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "kosher" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save classification" })
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "key: Key is required"
    );

    rerender(withNavigation(<ClassificationEditor classifications={[]} />));
    expect(screen.getByText("No classifications.")).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save classification" })
    ).not.toBeInTheDocument();
  });
});

describe("TagEditor", () => {
  it("adds and removes tags by saving the whole list", async () => {
    const onSetTags = vi.fn(async () => ok);
    render(<TagEditor tags={["pantry"]} onSetTags={onSetTags} />);

    fireEvent.change(screen.getByLabelText("Add a tag"), {
      target: { value: " baking " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add tag" }));
    await waitFor(() =>
      expect(onSetTags).toHaveBeenCalledWith(["pantry", "baking"])
    );

    fireEvent.change(screen.getByLabelText("Add a tag"), {
      target: { value: "PANTRY" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add tag" }));
    expect(onSetTags).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Remove pantry" }));
    await waitFor(() => expect(onSetTags).toHaveBeenLastCalledWith([]));
  });

  it("lists tags read-only without an action", () => {
    const { rerender } = render(<TagEditor tags={["pantry"]} />);
    expect(screen.getByRole("list", { name: "Tags" })).toHaveTextContent(
      "pantry"
    );
    expect(screen.queryByLabelText("Add a tag")).not.toBeInTheDocument();
    rerender(<TagEditor tags={[]} />);
    expect(screen.getByText("No tags.")).toBeInTheDocument();
  });
});

describe("SubstitutionEditor", () => {
  it("adds a substitute with a ratio and removes one", async () => {
    const onSetSubstitution = vi.fn(async () => ok);
    const onRemoveSubstitution = vi.fn(async () => ok);
    render(
      withNavigation(
        <SubstitutionEditor
          substitutions={[{ concept: MILK, ratio: null, note: null }]}
          onSetSubstitution={onSetSubstitution}
          onRemoveSubstitution={onRemoveSubstitution}
          onSearchConcepts={vi.fn(async () => [YOGURT])}
        />
      )
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove milk" }));
    await waitFor(() =>
      expect(onRemoveSubstitution).toHaveBeenCalledWith(MILK.id)
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Substitute" }), {
      target: { value: "yog" },
    });
    fireEvent.mouseDown(
      await screen.findByRole(
        "option",
        { name: "plain yogurt" },
        { timeout: 2000 }
      )
    );
    fireEvent.change(screen.getByLabelText("Ratio (optional)"), {
      target: { value: "3/4 cup per cup" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add substitution" }));
    await waitFor(() =>
      expect(onSetSubstitution).toHaveBeenCalledWith({
        substituteId: YOGURT.id,
        ratio: "3/4 cup per cup",
        note: null,
      })
    );
    expect(await screen.findByText("Added plain yogurt")).toBeInTheDocument();
  });

  it("shows an empty, read-only list without actions", () => {
    render(withNavigation(<SubstitutionEditor substitutions={[]} />));
    expect(screen.getByText("No substitutions.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add substitution" })
    ).not.toBeInTheDocument();
  });
});
