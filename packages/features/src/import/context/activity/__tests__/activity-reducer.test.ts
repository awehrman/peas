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

  it("returns the same state for an empty batch", () => {
    const initial = createMockActivityState();

    expect(activityBatchReducer(initial, [])).toBe(initial);
  });
});
