import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  createMockActivityState,
  createMockImportStatsState,
  createMockUploadBatch,
  createMockUploadState,
} from "../../../test-utils/factories";
import type { ImportCard } from "../../types/import-types";
import { createInitialCard } from "../../utils/activity-helpers";
import { buildImportRows, summarizeSteps } from "../../utils/import-rows";
import { ImportOverview } from "../import-overview";

function renderOverview() {
  const failing: ImportCard = { ...createInitialCard("failing"), title: "Broken stew" };
  failing.status.ingredientProcessing = {
    started: true,
    completed: false,
    hasError: true,
    errorMessage: "Could not parse line",
  };
  const done: ImportCard = {
    ...createInitialCard("done", "note-done"),
    title: "Venison stew",
    source: "https://www.seriouseats.com/venison-stew",
    thumbnailUrl: "https://cdn.example.com/stew.jpg",
    isComplete: true,
  };
  const cards = [done, failing];
  const activity = createMockActivityState({
    cardIds: cards.map((card) => card.id),
    cardsById: Object.fromEntries(cards.map((card) => [card.id, card])),
  });
  const uploads = createMockUploadState({
    previousBatches: [
      createMockUploadBatch({ importId: "done" }),
      createMockUploadBatch({ importId: "failing" }),
      createMockUploadBatch({ importId: "queued", directoryName: "Waiting soup" }),
    ],
  });

  return render(
    <ImportOverview
      rows={buildImportRows(uploads, activity)}
      steps={summarizeSteps(activity)}
      library={createMockImportStatsState({ numberOfNotes: 120 })}
    />
  );
}

function noteTitles(): string[] {
  return within(screen.getByRole("region", { name: "Note list" }))
    .getAllByRole("listitem")
    .map((item) => item.querySelector("p")?.textContent ?? "");
}

describe("ImportOverview", () => {
  it("summarizes the import in tiles and the status card", () => {
    renderOverview();

    const overview = screen.getByRole("region", { name: "Import overview" });
    expect(within(overview).getByText("Notes in this import").nextSibling).toHaveTextContent("3");
    expect(within(overview).getByText("Notes in your library").nextSibling).toHaveTextContent(
      "120"
    );
    expect(screen.getByText("1 note needs a look")).toBeInTheDocument();
  });

  it("lists each note once, problems first, with its source and thumbnail", () => {
    const { container } = renderOverview();

    expect(noteTitles()).toEqual(["Broken stew", "Waiting soup", "Venison stew"]);
    expect(screen.getByText("Could not parse line")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "seriouseats.com" })).toHaveAttribute(
      "href",
      "https://www.seriouseats.com/venison-stew"
    );
    expect(screen.getByRole("link", { name: "Venison stew" })).toHaveAttribute(
      "href",
      "/notes/note-done"
    );
    expect(container.querySelector('img[src="https://cdn.example.com/stew.jpg"]')).not.toBeNull();
  });

  it("filters the list", () => {
    renderOverview();

    fireEvent.click(screen.getByRole("button", { name: /Imported/ }));

    expect(screen.getByRole("button", { name: /Imported/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(noteTitles()).toEqual(["Venison stew"]);
  });

  it("mentions the library size before anything is imported", () => {
    render(
      <ImportOverview
        rows={[]}
        steps={[]}
        library={createMockImportStatsState({ numberOfNotes: 120 })}
      />
    );

    expect(screen.getByText(/You have 120 notes so far/)).toBeInTheDocument();
  });
});
