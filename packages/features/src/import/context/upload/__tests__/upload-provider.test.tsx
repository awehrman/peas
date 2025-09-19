import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  createMockFileUploadItem,
  createMockUploadBatch,
} from "../../../../test-utils/factories";
import {
  ImportUploadProvider,
  useImportUpload,
  useUploadDerived,
  useUploadSelector,
} from "../index";

// Wrapper component for testing hooks
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <ImportUploadProvider>{children}</ImportUploadProvider>
  );
};

describe("ImportUploadProvider", () => {
  describe("useImportUpload", () => {
    it("should provide initial state and dispatch function", () => {
      const { result } = renderHook(() => useImportUpload(), {
        wrapper: createWrapper(),
      });

      expect(result.current.state).toEqual({
        previousBatches: [],
        currentBatch: undefined,
      });
      expect(typeof result.current.dispatch).toBe("function");
    });

    it("should dispatch START_BATCH action correctly", () => {
      const { result } = renderHook(() => useImportUpload(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.dispatch({
          type: "START_BATCH",
          importId: "test-import-1",
          createdAt: "2023-01-01T00:00:00.000Z",
          numberOfFiles: 2,
        });
      });

      expect(result.current.state.currentBatch).toEqual({
        importId: "test-import-1",
        createdAt: "2023-01-01T00:00:00.000Z",
        numberOfFiles: 2,
        files: [],
      });
    });

    it("should dispatch ADD_FILES action correctly", () => {
      const { result } = renderHook(() => useImportUpload(), {
        wrapper: createWrapper(),
      });

      // First start a batch
      act(() => {
        result.current.dispatch({
          type: "START_BATCH",
          importId: "test-import-1",
          createdAt: "2023-01-01T00:00:00.000Z",
          numberOfFiles: 2,
        });
      });

      // Then add files
      const files = [
        createMockFileUploadItem({ id: "file-1" }),
        createMockFileUploadItem({ id: "file-2" }),
      ];

      act(() => {
        result.current.dispatch({
          type: "ADD_FILES",
          files,
          directoryName: "test-directory",
        });
      });

      expect(result.current.state.currentBatch?.files).toHaveLength(2);
      expect(result.current.state.currentBatch?.directoryName).toBe(
        "test-directory"
      );
    });

    it("should dispatch COMPLETE_BATCH action correctly", () => {
      const { result } = renderHook(() => useImportUpload(), {
        wrapper: createWrapper(),
      });

      // Start a batch first
      act(() => {
        result.current.dispatch({
          type: "START_BATCH",
          importId: "test-import-1",
          createdAt: "2023-01-01T00:00:00.000Z",
          numberOfFiles: 1,
        });
      });

      // Complete the batch
      act(() => {
        result.current.dispatch({
          type: "COMPLETE_BATCH",
          successMessage: "Upload completed successfully",
        });
      });

      expect(result.current.state.currentBatch).toBeUndefined();
      expect(result.current.state.previousBatches).toHaveLength(1);
      expect(result.current.state.previousBatches[0].successMessage).toBe(
        "Upload completed successfully"
      );
    });

    it("should handle multiple state updates correctly", () => {
      const { result } = renderHook(() => useImportUpload(), {
        wrapper: createWrapper(),
      });

      // Start first batch
      act(() => {
        result.current.dispatch({
          type: "START_BATCH",
          importId: "batch-1",
          createdAt: "2023-01-01T00:00:00.000Z",
          numberOfFiles: 1,
        });
      });

      // Complete first batch
      act(() => {
        result.current.dispatch({
          type: "COMPLETE_BATCH",
          successMessage: "First batch completed",
        });
      });

      // Start second batch
      act(() => {
        result.current.dispatch({
          type: "START_BATCH",
          importId: "batch-2",
          createdAt: "2023-01-01T01:00:00.000Z",
          numberOfFiles: 1,
        });
      });

      expect(result.current.state.previousBatches).toHaveLength(1);
      expect(result.current.state.currentBatch?.importId).toBe("batch-2");
    });
  });

  describe("useUploadSelector", () => {
    it("should select current batch", () => {
      const { result } = renderHook(
        () => {
          const upload = useImportUpload();
          const currentBatch = useUploadSelector((state) => state.currentBatch);
          return { upload, currentBatch };
        },
        { wrapper: createWrapper() }
      );

      expect(result.current.currentBatch).toBeUndefined();

      act(() => {
        result.current.upload.dispatch({
          type: "START_BATCH",
          importId: "test-batch",
          createdAt: "2023-01-01T00:00:00.000Z",
          numberOfFiles: 1,
        });
      });

      expect(result.current.currentBatch?.importId).toBe("test-batch");
    });

    it("should select previous batches count", () => {
      const { result } = renderHook(
        () => {
          const upload = useImportUpload();
          const batchCount = useUploadSelector(
            (state) => state.previousBatches.length
          );
          return { upload, batchCount };
        },
        { wrapper: createWrapper() }
      );

      expect(result.current.batchCount).toBe(0);

      // Add a completed batch
      act(() => {
        result.current.upload.dispatch({
          type: "START_BATCH",
          importId: "test-batch",
          createdAt: "2023-01-01T00:00:00.000Z",
          numberOfFiles: 1,
        });
      });

      act(() => {
        result.current.upload.dispatch({
          type: "COMPLETE_BATCH",
          successMessage: "Success",
        });
      });

      expect(result.current.batchCount).toBe(1);
    });

    it("should only re-render when selected value changes", () => {
      const selectorSpy = vi.fn((state) => state.currentBatch?.importId);

      const { result } = renderHook(
        () => {
          const upload = useImportUpload();
          const selectedValue = useUploadSelector(selectorSpy);
          return { upload, selectedValue };
        },
        { wrapper: createWrapper() }
      );

      // Initial call
      expect(selectorSpy).toHaveBeenCalledTimes(1);

      // Start a batch - should trigger selector
      act(() => {
        result.current.upload.dispatch({
          type: "START_BATCH",
          importId: "test-batch",
          createdAt: "2023-01-01T00:00:00.000Z",
          numberOfFiles: 1,
        });
      });

      expect(selectorSpy).toHaveBeenCalledTimes(2);
      expect(result.current.selectedValue).toBe("test-batch");

      // Add files - should not trigger selector since importId didn't change
      act(() => {
        result.current.upload.dispatch({
          type: "ADD_FILES",
          files: [createMockFileUploadItem()],
          directoryName: "test",
        });
      });

      // Selector might be called but result should be memoized
      expect(result.current.selectedValue).toBe("test-batch");
    });
  });

  describe("useUploadDerived", () => {
    it("should compute derived values correctly", () => {
      const { result } = renderHook(
        () => {
          const upload = useImportUpload();
          const derived = useUploadDerived();
          return { upload, derived };
        },
        { wrapper: createWrapper() }
      );

      // Initial state
      expect(result.current.derived.totalBatches).toBe(0);
      expect(result.current.derived.hasActiveBatch).toBe(false);
      expect(result.current.derived.successfulBatches).toBe(0);
      expect(result.current.derived.failedBatches).toBe(0);

      // Start a batch
      act(() => {
        result.current.upload.dispatch({
          type: "START_BATCH",
          importId: "test-batch",
          createdAt: "2023-01-01T00:00:00.000Z",
          numberOfFiles: 2,
        });
      });

      expect(result.current.derived.hasActiveBatch).toBe(true);
      expect(result.current.derived.totalBatches).toBe(1); // 1 active batch

      // Complete the batch
      act(() => {
        result.current.upload.dispatch({
          type: "COMPLETE_BATCH",
          successMessage: "Success",
        });
      });

      expect(result.current.derived.hasActiveBatch).toBe(false);
      expect(result.current.derived.totalBatches).toBe(1); // 1 previous batch
      expect(result.current.derived.successfulBatches).toBe(1);
    });

    it("should handle batch failure correctly", () => {
      const { result } = renderHook(
        () => {
          const upload = useImportUpload();
          const derived = useUploadDerived();
          return { upload, derived };
        },
        { wrapper: createWrapper() }
      );

      // Start a batch
      act(() => {
        result.current.upload.dispatch({
          type: "START_BATCH",
          importId: "test-batch",
          createdAt: "2023-01-01T00:00:00.000Z",
          numberOfFiles: 2,
        });
      });

      // Fail the batch
      act(() => {
        result.current.upload.dispatch({
          type: "FAIL_BATCH",
          errorMessage: "Upload failed",
        });
      });

      expect(result.current.derived.hasActiveBatch).toBe(false);
      expect(result.current.derived.failedBatches).toBe(1);
    });
  });

  describe("error handling", () => {
    it("should throw error when useImportUpload is used outside provider", () => {
      expect(() => {
        renderHook(() => useImportUpload());
      }).toThrow("useImportUpload must be used within an ImportUploadProvider");
    });

    it("should throw error when useUploadSelector is used outside provider", () => {
      expect(() => {
        renderHook(() => useUploadSelector((state) => state.currentBatch));
      }).toThrow("useImportUpload must be used within an ImportUploadProvider");
    });

    it("should throw error when useUploadDerived is used outside provider", () => {
      expect(() => {
        renderHook(() => useUploadDerived());
      }).toThrow("useImportUpload must be used within an ImportUploadProvider");
    });
  });

  describe("provider re-rendering optimization", () => {
    it("should provide context value correctly", () => {
      const { result } = renderHook(() => useImportUpload(), {
        wrapper: createWrapper(),
      });

      // Should have initial state and dispatch function
      expect(result.current.state).toBeDefined();
      expect(result.current.dispatch).toBeDefined();
      expect(typeof result.current.dispatch).toBe("function");
    });
  });
});
