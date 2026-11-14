import { describe, expect, it } from "vitest";

import { createMockActivityState } from "../../../../test-utils/factories";
import type { ActivityAction } from "../../../types/import-types";
import { createInitialCard } from "../../../utils/activity-helpers";
import { activityBatchReducer, activityReducer } from "../activity-reducer";

function addCard(id: string): ActivityAction {
  return { type: "ADD_IMPORT_CARD", card: createInitialCard(id) };
}

describe("activityReducer ADD_IMPORT_CARD", () => {
  it("keeps cards in arrival order", () => {
    const state = activityBatchReducer(createMockActivityState(), [
      addCard("card-1"),
      addCard("card-2"),
      addCard("card-3"),
    ]);

    expect(state.cardIds).toEqual(["card-1", "card-2", "card-3"]);
  });

  it("ignores a card that already exists", () => {
    const state = activityReducer(createMockActivityState(), addCard("card-1"));

    expect(activityReducer(state, addCard("card-1"))).toBe(state);
  });
});

describe("activityBatchReducer", () => {
  it("applies actions in order", () => {
    const state = activityBatchReducer(createMockActivityState(), [
      addCard("card-1"),
      {
        type: "UPDATE_CARD_STATUS",
        cardId: "card-1",
        step: "savedNote",
        statusUpdate: { started: true, completed: true },
      },
      {
        type: "UPDATE_CARD_DETAILS",
        cardId: "card-1",
        details: { title: "Venison stew", source: "https://example.com/stew" },
      },
    ]);

    const card = state.cardsById["card-1"];
    expect(card?.status.savedNote).toMatchObject({ started: true, completed: true });
    expect(card?.status.uploaded).toMatchObject({ completed: true });
    expect(card).toMatchObject({ title: "Venison stew", source: "https://example.com/stew" });
  });

  it("records the note id from the first status update that carries it", () => {
    const update = (noteId: string): ActivityAction => ({
      type: "UPDATE_CARD_STATUS",
      cardId: "card-1",
      step: "ingredientProcessing",
      statusUpdate: { started: true },
      noteId,
    });

    const state = activityBatchReducer(createMockActivityState(), [
      addCard("card-1"),
      update("note-1"),
      update("note-2"),
    ]);

    expect(state.cardsById["card-1"]?.noteId).toBe("note-1");
  });

  it("never moves a step's progress backwards when events arrive out of order", () => {
    const update = (statusUpdate: ActivityAction & { type: "UPDATE_CARD_STATUS" }["statusUpdate"]): ActivityAction => ({
      type: "UPDATE_CARD_STATUS",
      cardId: "card-1",
      step: "ingredientProcessing",
      statusUpdate,
    });

    const state = activityBatchReducer(createMockActivityState(), [
      addCard("card-1"),
      update({ started: true, processedSteps: 8, steps: 14 }),
      update({ started: true, hasError: true, errorMessage: "Could not parse line" }),
      update({ started: true, completed: false, hasError: false, processedSteps: 5, steps: 14 }),
      update({ started: true, completed: true, processedSteps: 14, steps: 14 }),
      update({ started: true, completed: false, processedSteps: 9, steps: 14 }),
    ]);

    expect(state.cardsById["card-1"]?.status.ingredientProcessing).toMatchObject({
      completed: true,
      hasError: true,
      errorMessage: "Could not parse line",
      processedSteps: 14,
    });
  });

  it("keeps a finished note finished", () => {
    const state = activityBatchReducer(createMockActivityState(), [
      addCard("card-1"),
      { type: "UPDATE_CARD_DETAILS", cardId: "card-1", details: { isComplete: true } },
      { type: "UPDATE_CARD_DETAILS", cardId: "card-1", details: { isComplete: false } },
    ]);

    expect(state.cardsById["card-1"]?.isComplete).toBe(true);
  });

  it("does not change the input state", () => {
    const initial = activityReducer(createMockActivityState(), addCard("card-1"));
    const snapshot = structuredClone(initial);

    activityBatchReducer(initial, [
      addCard("card-2"),
      {
        type: "UPDATE_CARD_STATUS",
        cardId: "card-1",
        step: "savedNote",
        statusUpdate: { started: true, completed: true },
      },
    ]);

    expect(initial).toEqual(snapshot);
  });

  it("returns the same state for an empty batch", () => {
    const initial = createMockActivityState();

    expect(activityBatchReducer(initial, [])).toBe(initial);
  });
});
