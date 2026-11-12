import { describe, expect, it } from "vitest";

import {
  createMockActivityState,
  createMockUploadBatch,
  createMockUploadState,
} from "../../../test-utils/factories";
import type { ImportCard } from "../../types/import-types";
import { createInitialCard } from "../activity-helpers";
import {
  buildImportRows,
  formatSource,
  summarizeImportRows,
  summarizeSteps,
} from "../import-rows";

function card(id: string, overrides: Partial<ImportCard> = {}): ImportCard {
  return { ...createInitialCard(id), ...overrides };
}

function activityOf(...cards: ImportCard[]) {
  return createMockActivityState({
    cardIds: cards.map((c) => c.id),
    cardsById: Object.fromEntries(cards.map((c) => [c.id, c])),
  });
}

describe("buildImportRows", () => {
  it("merges an upload with its queue card, preferring the note's real title", () => {
    const uploads = createMockUploadState({
      previousBatches: [createMockUploadBatch({ importId: "a", directoryName: "stew-file" })],
    });
    const activity = activityOf(
      card("a", {
        title: "Venison stew",
        noteId: "note-a",
        source: "https://example.com/stew",
        thumbnailUrl: "https://cdn.example.com/a.jpg",
      })
    );

    const [row] = buildImportRows(uploads, activity);

    expect(row).toMatchObject({
      id: "a",
      title: "Venison stew",
      noteId: "note-a",
      source: "https://example.com/stew",
      thumbnailUrl: "https://cdn.example.com/a.jpg",
      status: "importing",
    });
  });

  it("falls back to the uploaded file name until the queue sends a title", () => {
    const uploads = createMockUploadState({
      previousBatches: [createMockUploadBatch({ importId: "a", directoryName: "Venison stew" })],
    });

    const [row] = buildImportRows(uploads, createMockActivityState());

    expect(row).toMatchObject({ title: "Venison stew", status: "queued" });
  });

  it("puts problems first, then active, waiting and finished notes", () => {
    const failingCard = card("failing");
    failingCard.status.ingredientProcessing = {
      started: true,
      completed: false,
      hasError: true,
      errorMessage: "Could not parse line",
    };
    const uploads = createMockUploadState({
      currentBatch: createMockUploadBatch({ importId: "uploading" }),
      previousBatches: [
        createMockUploadBatch({ importId: "done" }),
        createMockUploadBatch({ importId: "queued" }),
        createMockUploadBatch({ importId: "rejected", errorMessage: "Network error" }),
        createMockUploadBatch({ importId: "active" }),
        createMockUploadBatch({ importId: "failing" }),
      ],
    });
    const activity = activityOf(card("done", { isComplete: true }), card("active"), failingCard);

    const rows = buildImportRows(uploads, activity);

    expect(rows.map((row) => [row.id, row.status])).toEqual([
      ["rejected", "uploadFailed"],
      ["failing", "needsAttention"],
      ["active", "importing"],
      ["uploading", "uploading"],
      ["queued", "queued"],
      ["done", "imported"],
    ]);
    expect(rows[1]).toMatchObject({
      activity: "Parsing ingredients failed",
      errorMessage: "Could not parse line",
    });
  });

  it("describes the step in progress with its counts", () => {
    const active = card("a");
    active.status.ingredientProcessing = {
      started: true,
      completed: false,
      hasError: false,
      processedSteps: 12,
      steps: 20,
    };

    const [row] = buildImportRows(createMockUploadState(), activityOf(active));

    expect(row?.activity).toBe("Parsing ingredients · 12 of 20");
    expect(row?.steps.find((step) => step.key === "ingredientProcessing")?.state).toBe("active");
  });
});

describe("summarizeImportRows", () => {
  it("counts statuses and averages progress without failed uploads", () => {
    const uploads = createMockUploadState({
      previousBatches: [
        createMockUploadBatch({ importId: "done" }),
        createMockUploadBatch({ importId: "queued" }),
        createMockUploadBatch({ importId: "rejected", errorMessage: "Network error" }),
      ],
    });
    const rows = buildImportRows(uploads, activityOf(card("done", { isComplete: true })));

    const summary = summarizeImportRows(rows);

    expect(summary.total).toBe(3);
    expect(summary.counts).toMatchObject({ imported: 1, queued: 1, uploadFailed: 1 });
    expect(summary.overallProgress).toBe(50);
  });
});

describe("summarizeSteps", () => {
  it("counts finished notes per step, treating completed notes as done", () => {
    const partial = card("partial");
    partial.status.cleanedNote = { started: true, completed: true, hasError: false };

    const steps = summarizeSteps(activityOf(partial, card("done", { isComplete: true })));

    expect(steps.find((step) => step.key === "cleanedNote")).toMatchObject({
      completed: 2,
      total: 2,
    });
    expect(steps.find((step) => step.key === "addingImages")).toMatchObject({
      completed: 1,
      total: 2,
    });
    expect(steps.some((step) => step.key === "uploaded")).toBe(false);
  });
});

describe("formatSource", () => {
  it("shortens web addresses to their hostname", () => {
    expect(formatSource("https://www.seriouseats.com/venison-stew")).toEqual({
      label: "seriouseats.com",
      href: "https://www.seriouseats.com/venison-stew",
    });
  });

  it("keeps book references as written", () => {
    expect(formatSource("Salt Fat Acid Heat, p. 212")).toEqual({
      label: "Salt Fat Acid Heat, p. 212",
    });
  });

  it("does not link non-web schemes", () => {
    expect(formatSource("javascript:alert(1)")).toEqual({ label: "javascript:alert(1)" });
  });
});
