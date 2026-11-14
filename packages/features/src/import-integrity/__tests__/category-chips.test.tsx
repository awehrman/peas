import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CategoryChips, describeEvidence } from "../components/category-chips";
import type { CategoryMembership } from "../types";

function membership(overrides: Partial<CategoryMembership> & { name: string }): CategoryMembership {
  const { name, ...rest } = overrides;
  return {
    id: `m-${name}`,
    state: "APPROVED",
    origin: "MANUAL",
    evidence: [],
    decidedAt: null,
    category: { id: `c-${name}`, name, slug: name.toLowerCase(), kind: "MANUAL" },
    ...rest,
  };
}

const chicken = membership({
  name: "Chicken",
  state: "INFERRED",
  origin: "CONCEPT_RULE",
  evidence: [
    {
      lineId: "l1",
      mentionId: "mention-1",
      conceptId: "thigh",
      conceptName: "chicken thigh",
      path: [{ type: "PART_OF", conceptId: "chicken", conceptName: "chicken" }],
    },
  ],
});

describe("describeEvidence", () => {
  it("spells out the path from the mentioned food to the category's food", () => {
    expect(describeEvidence(chicken.evidence[0]!)).toBe("chicken thigh → part of → chicken");
    expect(describeEvidence({ conceptName: "chicken", path: [] })).toBe("chicken");
  });
});

describe("CategoryChips", () => {
  it("marks inferred categories as suggestions and explains them on request", async () => {
    const user = userEvent.setup();
    render(<CategoryChips memberships={[chicken, membership({ name: "Thanksgiving" })]} />);

    expect(screen.getByText("(suggested from ingredients)")).toBeInTheDocument();
    expect(screen.queryByText("chicken thigh → part of → chicken")).not.toBeInTheDocument();

    const why = screen.getByRole("button", { name: "Why?" });
    await user.click(why);
    expect(why).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("chicken thigh → part of → chicken")).toBeInTheDocument();
  });

  it("accepts and rejects suggestions, and removes approved categories", async () => {
    const user = userEvent.setup();
    const onApproveCategory = vi.fn().mockResolvedValue({ success: true });
    const onExcludeCategory = vi.fn().mockResolvedValue({ success: true });
    const onRemoveCategory = vi.fn().mockResolvedValue({ success: true });
    render(
      <CategoryChips
        memberships={[chicken, membership({ name: "Thanksgiving" })]}
        onApproveCategory={onApproveCategory}
        onExcludeCategory={onExcludeCategory}
        onRemoveCategory={onRemoveCategory}
      />
    );

    await user.click(screen.getByRole("button", { name: "Accept category Chicken" }));
    await user.click(screen.getByRole("button", { name: "Reject category Chicken" }));
    await user.click(screen.getByRole("button", { name: "Remove category Thanksgiving" }));

    await waitFor(() => expect(onRemoveCategory).toHaveBeenCalledWith("c-Thanksgiving"));
    expect(onApproveCategory).toHaveBeenCalledWith("c-Chicken");
    expect(onExcludeCategory).toHaveBeenCalledWith("c-Chicken");
    expect(screen.queryByRole("button", { name: "Accept category Thanksgiving" })).not.toBeInTheDocument();
  });

  it("keeps exclusions out of sight until asked, with Restore", async () => {
    const user = userEvent.setup();
    const onRestoreCategory = vi.fn().mockResolvedValue({ success: true });
    render(
      <CategoryChips
        memberships={[membership({ name: "Beef", state: "EXCLUDED" })]}
        onRestoreCategory={onRestoreCategory}
      />
    );

    expect(screen.queryByRole("list", { name: "Excluded categories" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Excluded (1)" }));
    const excluded = screen.getByRole("list", { name: "Excluded categories" });
    await user.click(within(excluded).getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(onRestoreCategory).toHaveBeenCalledWith("c-Beef"));
  });

  it("adds a manual category by name and clears the field", async () => {
    const user = userEvent.setup();
    const onAddCategory = vi.fn().mockResolvedValue({ success: true });
    render(<CategoryChips memberships={[]} onAddCategory={onAddCategory} />);

    const input = screen.getByLabelText("Add a category");
    await user.type(input, "  Freezer friendly ");
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(onAddCategory).toHaveBeenCalledWith("Freezer friendly"));
    await waitFor(() => expect(input).toHaveValue(""));
  });
});
