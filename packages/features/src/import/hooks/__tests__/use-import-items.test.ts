import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useImportItems } from "../use-import-items";
import type { StatusEvent } from "../use-status-websocket";

// Mock the usePagination hook
vi.mock("../use-pagination", () => ({
  usePagination: vi.fn(() => ({
    startIndex: 0,
    endIndex: 10,
    page: 1,
    limit: 10,
    totalItems: 25,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: false,
  })),
}));

describe("useImportItems", () => {
  const mockEvents: StatusEvent[] = [
    {
      importId: "test-import-1",
      noteId: "test-note-1",
      status: "PROCESSING",
      message: "Processing started",
      context: "note_creation",
      createdAt: "2023-01-01T00:00:00Z",
      metadata: {
        htmlFileName: "test.html",
        noteTitle: "Test Recipe",
      },
    },
    {
      importId: "test-import-1",
      noteId: "test-note-1",
      status: "COMPLETED",
      message: "Processing completed",
      context: "note_completion",
      createdAt: "2023-01-01T00:00:01Z",
      metadata: {
        htmlFileName: "test.html",
        noteTitle: "Test Recipe",
      },
    },
  ];

  it("should return both allItems and paginatedItems when pagination is enabled", () => {
    const { result } = renderHook(() =>
      useImportItems({
        events: mockEvents,
        enablePagination: true,
        itemsPerPage: 10,
      })
    );

    expect(result.current).toHaveProperty("allItems");
    expect(result.current).toHaveProperty("paginatedItems");
    expect(result.current).toHaveProperty("pagination");
    expect(Array.isArray(result.current.allItems)).toBe(true);
    expect(Array.isArray(result.current.paginatedItems)).toBe(true);
    expect(result.current.pagination).not.toBeNull();
  });

  it("should return both allItems and paginatedItems when pagination is disabled", () => {
    const { result } = renderHook(() =>
      useImportItems({
        events: mockEvents,
        enablePagination: false,
        itemsPerPage: 10,
      })
    );

    expect(result.current).toHaveProperty("allItems");
    expect(result.current).toHaveProperty("paginatedItems");
    expect(result.current).toHaveProperty("pagination");
    expect(Array.isArray(result.current.allItems)).toBe(true);
    expect(Array.isArray(result.current.paginatedItems)).toBe(true);
    expect(result.current.pagination).toBeNull();
  });

  it("should process events and create import items", () => {
    const { result } = renderHook(() =>
      useImportItems({
        events: mockEvents,
        enablePagination: false,
      })
    );

    expect(result.current.allItems).toHaveLength(1);
    expect(result.current.allItems[0]).toMatchObject({
      importId: "test-import-1",
      htmlFileName: "test.html",
      noteTitle: "Test Recipe",
      status: "completed",
    });
  });

  it("should handle empty events array", () => {
    const { result } = renderHook(() =>
      useImportItems({
        events: [],
        enablePagination: false,
      })
    );

    expect(result.current.allItems).toHaveLength(0);
    expect(result.current.paginatedItems).toHaveLength(0);
  });

  it("should skip categorization timeout events", () => {
    const eventsWithTimeout = [
      ...mockEvents,
      {
        importId: "test-import-1",
        noteId: "test-note-1",
        status: "FAILED",
        message: "Categorization timeout - continuing anyway",
        context: "wait_for_categorization_complete",
        createdAt: "2023-01-01T00:00:02Z",
        metadata: {},
      },
    ];

    const { result } = renderHook(() =>
      useImportItems({
        events: eventsWithTimeout,
        enablePagination: false,
      })
    );

    // Should still show as completed, not failed
    expect(result.current.allItems[0].status).toBe("completed");
  });
});
