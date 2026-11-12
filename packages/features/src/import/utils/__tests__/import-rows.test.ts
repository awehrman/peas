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
  createImportRowBuilder,
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

function withError(target: ImportCard): ImportCard {
  target.status.ingredientProcessing = {
    started: true,
    completed: false,
    hasError: true,
    errorMessage: "Could not parse line",
  };
  return target;
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
      hasIssues: false,
    });
  });

  it("keeps rows in upload order, including notes not uploaded yet", () => {
    const uploads = createMockUploadState({
      previousBatches: [
        createMockUploadBatch({ importId: "done" }),
        createMockUploadBatch({ importId: "rejected", errorMessage: "Network error" }),
        createMockUploadBatch({ importId: "queued" }),
        createMockUploadBatch({ importId: "failing" }),
      ],
      currentBatch: createMockUploadBatch({ importId: "uploading" }),
      pendingBatches: [createMockUploadBatch({ importId: "later", directoryName: "Later soup" })],
    });
    const activity = activityOf(card("done", { isComplete: true }), withError(card("failing")));

    const rows = buildImportRows(uploads, activity);

    expect(rows.map((row) => [row.id, row.status, row.hasIssues])).toEqual([
      ["done", "imported", false],
      ["rejected", "uploadFailed", false],
      ["queued", "queued", false],
      ["failing", "importing", true],
      ["uploading", "uploading", false],
      ["later", "notUploaded", false],
    ]);
    expect(rows[3]?.errorMessage).toBe("Could not parse line");
    expect(rows[5]).toMatchObject({ title: "Later soup", activity: "Waiting to upload" });
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

describe("createImportRowBuilder", () => {
  it("reuses rows for notes that did not change and rebuilds the ones that did", () => {
    const uploads = createMockUploadState({
      previousBatches: [
        createMockUploadBatch({ importId: "a" }),
        createMockUploadBatch({ importId: "b" }),
      ],
    });
    const cardA = card("a");
    const buildRows = createImportRowBuilder();

    const first = buildRows(uploads, activityOf(cardA, card("b")));
    const second = buildRows(uploads, activityOf(cardA, card("b", { isComplete: true })));

    expect(second[0]).toBe(first[0]);
    expect(second[1]).not.toBe(first[1]);
    expect(second[1]?.status).toBe("imported");
  });
});

describe("summarizeImportRows", () => {
  it("measures progress against every note in the selection", () => {
    const uploads = createMockUploadState({
      previousBatches: [
        createMockUploadBatch({ importId: "done" }),
        createMockUploadBatch({ importId: "rejected", errorMessage: "Network error" }),
      ],
      pendingBatches: [
        createMockUploadBatch({ importId: "later-1" }),
        createMockUploadBatch({ importId: "later-2" }),
      ],
    });
    const rows = buildImportRows(uploads, activityOf(card("done", { isComplete: true })));

    expect(summarizeImportRows(rows)).toMatchObject({
      total: 4,
      uploaded: 1,
      imported: 1,
      needsAttention: 1,
      overallProgress: 33,
    });
  });
});

describe("summarizeSteps", () => {
  it("counts finished notes per step out of the expected total", () => {
    const partial = card("partial");
    partial.status.cleanedNote = { started: true, completed: true, hasError: false };

    const steps = summarizeSteps(activityOf(partial, card("done", { isComplete: true })), 5);

    expect(steps.find((step) => step.key === "cleanedNote")).toMatchObject({
      completed: 2,
      total: 5,
    });
    expect(steps.find((step) => step.key === "addingImages")).toMatchObject({
      completed: 1,
      total: 5,
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
