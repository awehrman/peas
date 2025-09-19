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
      upload: { dispatch: mockUploadDispatch },
      stats: { dispatch: mockStatsDispatch },
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

  it("should initialize demo batch when enableDemoInit is true", () => {
    renderHook(() =>
      useInitialization({
        enableDemoInit: true,
      })
    );

    expect(mockUploadDispatch).toHaveBeenCalledWith({
      type: "START_BATCH",
      importId: expect.stringMatching(/^test-batch-\d+$/),
      createdAt: expect.any(String),
      numberOfFiles: 5,
    });
  });

  it("should not initialize demo batch when enableDemoInit is false", () => {
    renderHook(() =>
      useInitialization({
        enableDemoInit: false,
      })
    );

    expect(mockUploadDispatch).not.toHaveBeenCalled();
  });

  it("should handle both stats and demo initialization", () => {
    renderHook(() =>
      useInitialization({
        initialNoteCount: 15,
        initialIngredientCount: 30,
        initialParsingErrorCount: 2,
        enableDemoInit: true,
      })
    );

    expect(mockStatsDispatch).toHaveBeenCalledWith({
      type: "REFRESH_STATS",
      stats: {
        numberOfNotes: 15,
        numberOfIngredients: 30,
        numberOfParsingErrors: 2,
      },
    });

    expect(mockUploadDispatch).toHaveBeenCalledWith({
      type: "START_BATCH",
      importId: expect.stringMatching(/^test-batch-\d+$/),
      createdAt: expect.any(String),
      numberOfFiles: 5,
    });
  });

  it("should prevent double initialization in development mode", () => {
    const { rerender } = renderHook(() =>
      useInitialization({
        initialNoteCount: 10,
        enableDemoInit: true,
      })
    );

    // First render should initialize
    expect(mockStatsDispatch).toHaveBeenCalledTimes(1);
    expect(mockUploadDispatch).toHaveBeenCalledTimes(1);

    // Clear mocks and rerender
    vi.clearAllMocks();
    rerender();

    // Second render should not initialize again
    expect(mockStatsDispatch).not.toHaveBeenCalled();
    expect(mockUploadDispatch).not.toHaveBeenCalled();
  });

  it("should use default values for undefined parameters", () => {
    renderHook(() => useInitialization({}));

    // Should not dispatch anything with default values
    expect(mockStatsDispatch).not.toHaveBeenCalled();
    expect(mockUploadDispatch).not.toHaveBeenCalled();
  });

  it("should generate unique import IDs for demo batches", () => {
    renderHook(() =>
      useInitialization({
        enableDemoInit: true,
      })
    );

    const firstCall = mockUploadDispatch.mock.calls[0][0];

    // Clear and create a new hook instance
    vi.clearAllMocks();

    renderHook(() =>
      useInitialization({
        enableDemoInit: true,
      })
    );

    const secondCall = mockUploadDispatch.mock.calls[0][0];

    // Import IDs should be different (contain different timestamps)
    expect(firstCall.importId).not.toBe(secondCall.importId);
  });
});
