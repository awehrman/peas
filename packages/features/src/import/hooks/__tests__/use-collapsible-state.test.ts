import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCollapsibleState } from "../use-collapsible-state";

describe("useCollapsibleState", () => {
  const originalLocalStorage = global.localStorage;
  let mockLocalStorage: {
    getItem: vi.Mock;
    setItem: vi.Mock;
    removeItem: vi.Mock;
    clear: vi.Mock;
    key: vi.Mock;
    length: number;
  };

  beforeEach(() => {
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };
    Object.defineProperty(window, "localStorage", {
      value: mockLocalStorage,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      writable: true,
    });
    vi.clearAllMocks();
  });

  it("should handle localStorage getItem failures gracefully", () => {
    // Mock localStorage.getItem to throw an error
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error("Storage error");
    });

    const { result } = renderHook(() =>
      useCollapsibleState({
        storageKey: "test-key",
        persistState: true,
      })
    );

    // Should not crash and should start with empty state
    expect(result.current.expandedItems.size).toBe(0);
    expect(result.current.isExpanded("test-item")).toBe(false);
  });

  it("should handle localStorage setItem failures gracefully", () => {
    // Mock localStorage.setItem to throw an error
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error("Storage error");
    });

    const { result } = renderHook(() =>
      useCollapsibleState({
        storageKey: "test-key",
        persistState: true,
      })
    );

    // Should not crash when trying to save state
    act(() => {
      result.current.expandItem("test-item");
    });

    // State should still be updated locally even if storage fails
    expect(result.current.isExpanded("test-item")).toBe(true);
  });

  it("should handle JSON.parse failures gracefully", () => {
    // Mock localStorage.getItem to return invalid JSON
    mockLocalStorage.getItem.mockReturnValue("invalid json");

    const { result } = renderHook(() =>
      useCollapsibleState({
        storageKey: "test-key",
        persistState: true,
      })
    );

    // Should not crash and should start with empty state
    expect(result.current.expandedItems.size).toBe(0);
  });

  it("should work normally when localStorage is available", () => {
    // Mock localStorage to work normally
    mockLocalStorage.getItem.mockReturnValue('["item1", "item2"]');
    mockLocalStorage.setItem.mockImplementation(() => {});

    const { result } = renderHook(() =>
      useCollapsibleState({
        storageKey: "test-key",
        persistState: true,
      })
    );

    // Should load initial state
    expect(result.current.isExpanded("item1")).toBe(true);
    expect(result.current.isExpanded("item2")).toBe(true);
    expect(result.current.isExpanded("item3")).toBe(false);

    // Should save state when changed
    act(() => {
      result.current.expandItem("item3");
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "test-key",
      '["item1","item2","item3"]'
    );
  });

  it("should work without persistence when persistState is false", () => {
    const { result } = renderHook(() =>
      useCollapsibleState({
        storageKey: "test-key",
        persistState: false,
      })
    );

    act(() => {
      result.current.expandItem("test-item");
    });

    // Should not try to save to localStorage
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    expect(result.current.isExpanded("test-item")).toBe(true);
  });

  it("should handle toggle functionality correctly", () => {
    const { result } = renderHook(() =>
      useCollapsibleState({
        storageKey: "test-key",
        persistState: false,
      })
    );

    // Initially not expanded
    expect(result.current.isExpanded("test-item")).toBe(false);

    // Toggle to expanded
    act(() => {
      result.current.toggleItem("test-item");
    });
    expect(result.current.isExpanded("test-item")).toBe(true);

    // Toggle to collapsed
    act(() => {
      result.current.toggleItem("test-item");
    });
    expect(result.current.isExpanded("test-item")).toBe(false);
  });

  it("should handle expandAll and collapseAll correctly", () => {
    const { result } = renderHook(() =>
      useCollapsibleState({
        storageKey: "test-key",
        persistState: false,
      })
    );

    const itemIds = ["item1", "item2", "item3"];

    // Expand all
    act(() => {
      result.current.expandAll(itemIds);
    });

    itemIds.forEach((id) => {
      expect(result.current.isExpanded(id)).toBe(true);
    });

    // Collapse all
    act(() => {
      result.current.collapseAll();
    });

    itemIds.forEach((id) => {
      expect(result.current.isExpanded(id)).toBe(false);
    });
  });
});
