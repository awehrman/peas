import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { NoteDetail } from "../../notes/types";
import { type DuplicateReviewDetail, DuplicateReviewPageContent } from "../components/duplicate-review-page-content";
import type { DuplicateResolutionPreview } from "../types";

function note(id: string, title: string, lines: string[]): NoteDetail {
  return {
    id,
    title,
    status: "COMPLETED",
    createdAt: "2026-11-01T00:00:00.000Z",
    errorMessage: null,
    duplicateConfidence: null,
    parsingErrorCount: 0,
    archivedAt: null,
    archivedReason: null,
    supersededById: null,
    pendingDuplicateIds: [],
    evernote: null,
    images: [],
    sources: [],
    categories: [],
    tags: [],
    ingredientBlocks: [
      {
        blockIndex: 0,
        lines: lines.map((reference, lineIndex) => ({
          id: `${id}-${lineIndex}`,
          blockIndex: 0,
          lineIndex,
          reference,
          parseStatus: "COMPLETED_SUCCESSFULLY",
          reviewStatus: "UNREVIEWED",
          isActive: true,
          parserVersion: null,
          mentions: [],
        })),
      },
    ],
    instructions: [],
    recipeId: null,
  };
}

function detail(status: "PENDING" | "RESOLVED" = "PENDING"): DuplicateReviewDetail {
  return {
    id: "d1",
    candidate: {
      id: "d1",
      kind: "LIKELY",
      confidence: 0.93,
      status,
      signals: {
        rawHtmlHash: false,
        contentHash: false,
        sharedSourceIds: ["s1"],
        titleSimilarity: 0.97,
        ingredientSimilarity: 0.8,
        reasons: ["Same source", "Title similarity 97%"],
      },
      resolution: status === "RESOLVED" ? { keep: "EXISTING", mergeSources: true } : null,
      resolvedAt: status === "RESOLVED" ? "2026-11-13T00:00:00.000Z" : null,
      createdAt: "2026-11-12T00:00:00.000Z",
      incoming: { id: "n-new", title: "Chili", status: "DUPLICATE", createdAt: "", archivedAt: null, recipeId: null, ingredientLineCount: 3 },
      existing: { id: "n-old", title: "Chili", status: "COMPLETED", createdAt: "", archivedAt: null, recipeId: "r1", ingredientLineCount: 2 },
    },
    incomingNote: note("n-new", "Chili", ["1 onion", "2 lb beef", "1 tbsp cumin"]),
    existingNote: note("n-old", "Chili", ["1 onion", "2 lb beef"]),
  };
}

const PREVIEW: DuplicateResolutionPreview = {
  keptNote: { id: "n-old", title: "Chili" },
  archivedNote: { id: "n-new", title: "Chili" },
  attachedSources: [],
  primarySourceChange: null,
  carriedCategories: [],
  carriedTags: [],
  movedRecipeId: null,
  summary: ['Keep "Chili" and archive "Chili" (reversible; nothing is deleted).'],
};

describe("DuplicateReviewPageContent", () => {
  it("marks lines only one note has", () => {
    render(
      <DuplicateReviewPageContent
        detail={detail()}
        onPreview={vi.fn().mockResolvedValue(PREVIEW)}
        onResolve={vi.fn()}
        onUndo={vi.fn()}
      />
    );
    const incoming = screen.getByRole("region", { name: "Incoming ingredients" });
    expect(within(incoming).getByText("(only in this note)")).toBeInTheDocument();
    expect(within(incoming).getByText(/1 tbsp cumin/)).toBeInTheDocument();
  });

  it("previews each choice and applies the confirmed one, keeping content and sources separate", async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn().mockResolvedValue(PREVIEW);
    const onResolve = vi.fn().mockResolvedValue({ success: true });
    render(<DuplicateReviewPageContent detail={detail()} onPreview={onPreview} onResolve={onResolve} onUndo={vi.fn()} />);

    await waitFor(() => expect(onPreview).toHaveBeenCalledWith({ keep: "EXISTING", mergeSources: true }));
    expect(await screen.findByText(/nothing is deleted/)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/Keep both/));
    await waitFor(() => expect(onPreview).toHaveBeenLastCalledWith({ keep: "BOTH", mergeSources: false }));
    expect(screen.getByRole("checkbox")).toBeDisabled();

    await user.click(screen.getByLabelText(/Keep the incoming note/));
    await user.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(onPreview).toHaveBeenLastCalledWith({ keep: "INCOMING", mergeSources: false }));

    await user.click(screen.getByRole("button", { name: "Apply decision" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(onResolve).toHaveBeenCalledWith({ keep: "INCOMING", mergeSources: false }));
  });

  it("offers undo once decided", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn().mockResolvedValue({ success: true });
    const onPreview = vi.fn();
    render(<DuplicateReviewPageContent detail={detail("RESOLVED")} onPreview={onPreview} onResolve={vi.fn()} onUndo={onUndo} />);

    expect(screen.getByText(/Keep the existing note, sources merged/)).toBeInTheDocument();
    expect(onPreview).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Undo decision" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(onUndo).toHaveBeenCalled());
  });
});
