import { describe, expect, it } from "vitest";

import { createMockActivityState } from "../../../../test-utils/factories";
import { CARDS_PER_PAGE } from "../../../constants/activity-constants";
import type { ActivityAction } from "../../../types/import-types";
import { createInitialCard } from "../../../utils/activity-helpers";
import { activityBatchReducer, activityReducer } from "../activity-reducer";

function addCard(id: string): ActivityAction {
  return { type: "ADD_IMPORT_CARD", card: createInitialCard(id) };
}

describe("activityReducer ADD_IMPORT_CARD", () => {
  it("fills pages in order, independent of the page being viewed", () => {
    const actions = Array.from({ length: CARDS_PER_PAGE + 3 }, (_, i) => addCard(`card-${i}`));
    const state = activityBatchReducer(
      createMockActivityState({ currentPageIndex: 4 }),
      actions
    );

    expect(state.pageToCardIds[0]).toHaveLength(CARDS_PER_PAGE);
    expect(state.pageToCardIds[1]).toEqual(["card-10", "card-11", "card-12"]);
    expect(state.pageToCardIds[4]).toBeUndefined();
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
        pageIndex: 0,
        cardId: "card-1",
        step: "savedNote",
        statusUpdate: { started: true, completed: true },
      },
      { type: "UPDATE_CARD_TITLE", cardId: "card-1", title: "Venison stew" },
    ]);

    const card = state.cardsById["card-1"];
    expect(card?.status.savedNote).toMatchObject({ started: true, completed: true });
    expect(card?.status.uploaded).toMatchObject({ completed: true });
    expect(card?.imageThumbnail).toBe("Venison stew");
  });

  it("records the note id from the first status update that carries it", () => {
    const update = (noteId: string): ActivityAction => ({
      type: "UPDATE_CARD_STATUS",
      pageIndex: 0,
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
