import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockActivityState } from "../../../test-utils/factories";
import type { ActivityAction, StatusEvent } from "../../types/import-types";

const dispatch = vi.fn<(action: ActivityAction) => void>();

vi.mock("../../context/activity", () => ({
  useActivity: () => ({ state: createMockActivityState(), dispatch }),
}));

const { useWebSocketActivityIntegration } = await import(
  "../use-websocket-activity-integration"
);

function event(overrides: Partial<StatusEvent>): StatusEvent {
  return { importId: "import-1", status: "PROCESSING", ...overrides } as StatusEvent;
}

describe("useWebSocketActivityIntegration", () => {
  beforeEach(() => {
    dispatch.mockClear();
  });

  it("keeps updating the import's card after the note gets an id", () => {
    const { result } = renderHook(() => useWebSocketActivityIntegration());
    const handle = result.current.handleActivityStatusUpdate;

    handle(event({ context: "clean_html_start" }));
    handle(event({ noteId: "note-1", status: "COMPLETED", context: "ingredient_processing" }));

    const [addCard, , ingredientUpdate] = dispatch.mock.calls.map(([action]) => action);
    expect(addCard).toMatchObject({ type: "ADD_IMPORT_CARD", card: { id: "import-1" } });
    expect(ingredientUpdate).toMatchObject({
      type: "UPDATE_CARD_STATUS",
      cardId: "import-1",
      noteId: "note-1",
      step: "ingredientProcessing",
      statusUpdate: { completed: true },
    });
  });

  it("creates one card per import even before state catches up", () => {
    const { result } = renderHook(() => useWebSocketActivityIntegration());
    const handle = result.current.handleActivityStatusUpdate;

    handle(event({ context: "clean_html_start" }));
    handle(event({ context: "clean_html_end", status: "COMPLETED" }));

    const adds = dispatch.mock.calls.filter(([action]) => action.type === "ADD_IMPORT_CARD");
    expect(adds).toHaveLength(1);
  });

  it("updates the title of a card that has not rendered yet", () => {
    const { result } = renderHook(() => useWebSocketActivityIntegration());
    const handle = result.current.handleActivityStatusUpdate;

    handle(event({ context: "clean_html_start" }));
    handle(event({ context: "save_note", metadata: { title: "Venison stew" } }));

    expect(dispatch).toHaveBeenCalledWith({
      type: "UPDATE_CARD_TITLE",
      cardId: "import-1",
      title: "Venison stew",
    });
  });
});
