import { ReactNode } from "react";

import { act, renderHook } from "@testing-library/react";

import { ImportStateProvider, useImportState } from "../import-state-context";

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Test wrapper component
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ImportStateProvider>{children}</ImportStateProvider>
);

describe("ImportStateContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe("useImportState hook", () => {
    it("should throw error when used outside provider", () => {
      const { result } = renderHook(() => useImportState());

      expect(result.error).toEqual(
        new Error("useImportState must be used within an ImportStateProvider")
      );
    });

    it("should provide initial state", () => {
      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state).toEqual({
        uploadingHtmlFiles: [],
        fileTitles: new Map(),
        uploadItems: new Map(),
        connection: {
          status: "disconnected",
          reconnectAttempts: 0,
        },
        events: [],
        importItems: new Map(),
        expandedItems: new Set(),
        currentPage: 1,
        itemsPerPage: 10,
      });
    });
  });

  describe("Upload state management", () => {
    it("should add uploading HTML files", () => {
      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.addUploadingHtmlFiles(["file1.html", "file2.html"]);
      });

      expect(result.current.state.uploadingHtmlFiles).toEqual([
        "file1.html",
        "file2.html",
      ]);
    });

    it("should remove uploading HTML files", () => {
      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.addUploadingHtmlFiles([
          "file1.html",
          "file2.html",
          "file3.html",
        ]);
      });

      act(() => {
        result.current.removeUploadingHtmlFiles(["file2.html"]);
      });

      expect(result.current.state.uploadingHtmlFiles).toEqual([
        "file1.html",
        "file3.html",
      ]);
    });

    it("should add upload item", () => {
      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      const uploadItem = {
        importId: "test-id",
        htmlFileName: "test.html",
        imageCount: 5,
        status: "uploading" as const,
        createdAt: new Date(),
      };

      act(() => {
        result.current.addUploadItem(uploadItem);
      });

      expect(result.current.state.uploadItems.get("test-id")).toEqual(
        uploadItem
      );
    });

    it("should not add duplicate upload item", () => {
      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      const uploadItem = {
        importId: "test-id",
        htmlFileName: "test.html",
        imageCount: 5,
        status: "uploading" as const,
        createdAt: new Date(),
      };

      act(() => {
        result.current.addUploadItem(uploadItem);
      });

      const stateBefore = result.current.state;

      act(() => {
        result.current.addUploadItem(uploadItem);
      });

      // State should not change
      expect(result.current.state).toBe(stateBefore);
    });

    it("should update upload item with change detection", () => {
      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      const uploadItem = {
        importId: "test-id",
        htmlFileName: "test.html",
        imageCount: 5,
        status: "uploading" as const,
        createdAt: new Date(),
      };

      act(() => {
        result.current.addUploadItem(uploadItem);
      });

      act(() => {
        result.current.updateUploadItem("test-id", { status: "uploaded" });
      });

      const updatedItem = result.current.state.uploadItems.get("test-id");
      expect(updatedItem?.status).toBe("uploaded");
    });

    it("should not update if no changes detected", () => {
      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      const uploadItem = {
        importId: "test-id",
        htmlFileName: "test.html",
        imageCount: 5,
        status: "uploading" as const,
        createdAt: new Date(),
      };

      act(() => {
        result.current.addUploadItem(uploadItem);
      });

      const stateBefore = result.current.state;

      act(() => {
        result.current.updateUploadItem("test-id", { status: "uploading" });
      });

      // State should not change since status is the same
      expect(result.current.state).toBe(stateBefore);
    });
  });

  describe("Collapsible state management", () => {
    it("should track expanded items", () => {
      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.expandItem("item-1");
      });

      expect(result.current.isExpanded("item-1")).toBe(true);
      expect(result.current.state.expandedItems.has("item-1")).toBe(true);
    });

    it("should toggle item expansion", () => {
      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      // Initially not expanded
      expect(result.current.isExpanded("item-1")).toBe(false);

      act(() => {
        result.current.toggleItem("item-1");
      });

      // Should be expanded after first toggle
      expect(result.current.isExpanded("item-1")).toBe(true);

      act(() => {
        result.current.toggleItem("item-1");
      });

      // Should be collapsed after second toggle
      expect(result.current.isExpanded("item-1")).toBe(false);
    });

    it("should expand all items", () => {
      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      const itemIds = ["item-1", "item-2", "item-3"];

      act(() => {
        result.current.expandAll(itemIds);
      });

      itemIds.forEach((id) => {
        expect(result.current.isExpanded(id)).toBe(true);
      });
    });

    it("should collapse all items", () => {
      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      // First expand some items
      act(() => {
        result.current.expandAll(["item-1", "item-2"]);
      });

      // Then collapse all
      act(() => {
        result.current.collapseAll();
      });

      expect(result.current.state.expandedItems.size).toBe(0);
    });
  });

  describe("Connection state management", () => {
    it("should update connection status", () => {
      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      const connectionState = {
        status: "connected" as const,
        reconnectAttempts: 2,
      };

      act(() => {
        result.current.setConnectionStatus(connectionState);
      });

      expect(result.current.state.connection).toEqual(connectionState);
    });
  });

  describe("Pagination state management", () => {
    it("should update current page", () => {
      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setCurrentPage(3);
      });

      expect(result.current.state.currentPage).toBe(3);
    });

    it("should update items per page and reset to page 1", () => {
      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      // Set to page 3 first
      act(() => {
        result.current.setCurrentPage(3);
      });

      // Change items per page
      act(() => {
        result.current.setItemsPerPage(20);
      });

      expect(result.current.state.itemsPerPage).toBe(20);
      expect(result.current.state.currentPage).toBe(1); // Should reset to page 1
    });
  });

  describe("localStorage persistence", () => {
    it("should load expanded state from localStorage on init", () => {
      const mockExpandedItems = ["item-1", "item-2"];
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(mockExpandedItems)
      );

      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      // Should load the expanded items from localStorage
      mockExpandedItems.forEach((id) => {
        expect(result.current.isExpanded(id)).toBe(true);
      });
    });

    it("should save expanded state to localStorage with debouncing", async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.expandItem("item-1");
      });

      // Should not save immediately
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      // Fast forward past the debounce delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "import-state-expanded",
        JSON.stringify(["item-1"])
      );

      jest.useRealTimers();
    });
  });

  describe("generateImportId", () => {
    it("should generate unique import IDs", () => {
      const { result } = renderHook(() => useImportState(), {
        wrapper: TestWrapper,
      });

      const id1 = result.current.generateImportId();
      const id2 = result.current.generateImportId();

      expect(id1).toMatch(/^import_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^import_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});
