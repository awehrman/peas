import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useImport } from "../use-import";
import { useInitialization } from "../use-initialization";

// Mock the useImport hook
vi.mock("../use-import", () => ({
  useImport: vi.fn(),
}));

describe("useInitialization", () => {
  const mockUploadDispatch = vi.fn();
  const mockStatsDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useImport).mockReturnValue({
      upload: {
        state: { previousBatches: [] },
        dispatch: mockUploadDispatch,
      },
      stats: {
        state: {
          numberOfNotes: 0,
          numberOfIngredients: 0,
          numberOfParsingErrors: 0,
        },
        dispatch: mockStatsDispatch,
      },
      ws: {} as any,
      activity: {} as any,
    });
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() => useInitialization({}));

    // Hook should complete without errors
    expect(result.current).toBeUndefined();
  });

  it("should dispatch stats refresh when initial data provided", () => {
    renderHook(() =>
      useInitialization({
        initialNoteCount: 10,
        initialIngredientCount: 25,
        initialParsingErrorCount: 3,
      })
    );

    expect(mockStatsDispatch).toHaveBeenCalledWith({
      type: "REFRESH_STATS",
      stats: {
        numberOfNotes: 10,
        numberOfIngredients: 25,
        numberOfParsingErrors: 3,
      },
    });
  });

  it("should not dispatch stats when all values are zero", () => {
    renderHook(() =>
      useInitialization({
        initialNoteCount: 0,
        initialIngredientCount: 0,
        initialParsingErrorCount: 0,
      })
    );

    expect(mockStatsDispatch).not.toHaveBeenCalled();
  });

  it("should dispatch stats when only some values are provided", () => {
    renderHook(() =>
      useInitialization({
        initialNoteCount: 5,
        initialIngredientCount: 0,
        initialParsingErrorCount: 0,
      })
    );

    expect(mockStatsDispatch).toHaveBeenCalledWith({
      type: "REFRESH_STATS",
      stats: {
        numberOfNotes: 5,
        numberOfIngredients: 0,
        numberOfParsingErrors: 0,
      },
    });
  });

  it("should prevent double initialization in development mode", () => {
    const { rerender } = renderHook(() =>
      useInitialization({
        initialNoteCount: 10,
      })
    );

    // First render should initialize
    expect(mockStatsDispatch).toHaveBeenCalledTimes(1);

    // Clear mocks and rerender
    vi.clearAllMocks();
    rerender();

    // Second render should not initialize again
    expect(mockStatsDispatch).not.toHaveBeenCalled();
  });

  it("should use default values for undefined parameters", () => {
    renderHook(() => useInitialization({}));

    // Should not dispatch anything with default values
    expect(mockStatsDispatch).not.toHaveBeenCalled();
  });
});
