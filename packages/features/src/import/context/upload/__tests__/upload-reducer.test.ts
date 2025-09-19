import { describe, expect, it } from "vitest";

import {
  createMockFileUploadItem,
  createMockUploadBatch,
} from "../../../../test-utils/factories";
import type { UploadAction, UploadState } from "../../../types/import-types";
import { defaultUploadState, uploadReducer } from "../upload-reducer";

describe("uploadReducer", () => {
  describe("START_BATCH", () => {
    it("should start a new batch with provided details", () => {
      const action: UploadAction = {
        type: "START_BATCH",
        importId: "test-import-1",
        createdAt: "2023-01-01T00:00:00.000Z",
        numberOfFiles: 3,
      };

      const result = uploadReducer(defaultUploadState, action);

      expect(result).toEqual({
        previousBatches: [],
        currentBatch: {
          importId: "test-import-1",
          createdAt: "2023-01-01T00:00:00.000Z",
          numberOfFiles: 3,
          files: [],
        },
      });
    });

    it("should replace existing current batch when starting new one", () => {
      const initialState: UploadState = {
        previousBatches: [],
        currentBatch: createMockUploadBatch({ importId: "old-batch" }),
      };

      const action: UploadAction = {
        type: "START_BATCH",
        importId: "new-batch",
        createdAt: "2023-01-02T00:00:00.000Z",
        numberOfFiles: 2,
      };

      const result = uploadReducer(initialState, action);

      expect(result.currentBatch).toEqual({
        importId: "new-batch",
        createdAt: "2023-01-02T00:00:00.000Z",
        numberOfFiles: 2,
        files: [],
      });
    });
  });

  describe("ADD_FILES", () => {
    it("should add files to current batch", () => {
      const currentBatch = createMockUploadBatch({
        files: [createMockFileUploadItem({ id: "existing-file" })],
      });
      const initialState: UploadState = {
        previousBatches: [],
        currentBatch,
      };

      const newFiles = [
        createMockFileUploadItem({ id: "new-file-1" }),
        createMockFileUploadItem({ id: "new-file-2" }),
      ];

      const action: UploadAction = {
        type: "ADD_FILES",
        files: newFiles,
        directoryName: "test-directory",
      };

      const result = uploadReducer(initialState, action);

      expect(result.currentBatch?.files).toHaveLength(3);
      expect(result.currentBatch?.files[0].id).toBe("existing-file");
      expect(result.currentBatch?.files[1].id).toBe("new-file-1");
      expect(result.currentBatch?.files[2].id).toBe("new-file-2");
      expect(result.currentBatch?.directoryName).toBe("test-directory");
    });

    it("should return unchanged state when no current batch exists", () => {
      const action: UploadAction = {
        type: "ADD_FILES",
        files: [createMockFileUploadItem()],
        directoryName: "test-directory",
      };

      const result = uploadReducer(defaultUploadState, action);

      expect(result).toBe(defaultUploadState);
    });
  });

  describe("UPDATE_FILE_STATUS", () => {
    it("should update specific file status and progress", () => {
      const files = [
        createMockFileUploadItem({
          id: "file-1",
          status: "pending",
          progress: 0,
        }),
        createMockFileUploadItem({
          id: "file-2",
          status: "pending",
          progress: 0,
        }),
      ];
      const currentBatch = createMockUploadBatch({ files });
      const initialState: UploadState = {
        previousBatches: [],
        currentBatch,
      };

      const action: UploadAction = {
        type: "UPDATE_FILE_STATUS",
        fileId: "file-1",
        status: "uploading",
        progress: 50,
      };

      const result = uploadReducer(initialState, action);

      expect(result.currentBatch?.files[0]).toEqual({
        ...files[0],
        status: "uploading",
        progress: 50,
      });
      expect(result.currentBatch?.files[1]).toEqual(files[1]); // Unchanged
    });

    it("should update file with error message", () => {
      const files = [createMockFileUploadItem({ id: "file-1" })];
      const currentBatch = createMockUploadBatch({ files });
      const initialState: UploadState = {
        previousBatches: [],
        currentBatch,
      };

      const action: UploadAction = {
        type: "UPDATE_FILE_STATUS",
        fileId: "file-1",
        status: "failed",
        error: "Upload failed",
      };

      const result = uploadReducer(initialState, action);

      expect(result.currentBatch?.files[0]).toEqual({
        ...files[0],
        status: "failed",
        error: "Upload failed",
      });
    });

    it("should return unchanged state when no current batch exists", () => {
      const action: UploadAction = {
        type: "UPDATE_FILE_STATUS",
        fileId: "file-1",
        status: "uploading",
        progress: 50,
      };

      const result = uploadReducer(defaultUploadState, action);

      expect(result).toBe(defaultUploadState);
    });

    it("should return state with unchanged files when file ID not found", () => {
      const files = [createMockFileUploadItem({ id: "file-1" })];
      const currentBatch = createMockUploadBatch({ files });
      const initialState: UploadState = {
        previousBatches: [],
        currentBatch,
      };

      const action: UploadAction = {
        type: "UPDATE_FILE_STATUS",
        fileId: "non-existent-file",
        status: "uploading",
        progress: 50,
      };

      const result = uploadReducer(initialState, action);

      // Files should remain unchanged
      expect(result.currentBatch?.files).toEqual(files);
      // But it's a new state object
      expect(result).not.toBe(initialState);
    });
  });

  describe("REMOVE_FILE", () => {
    it("should remove specific file from current batch", () => {
      const files = [
        createMockFileUploadItem({ id: "file-1" }),
        createMockFileUploadItem({ id: "file-2" }),
        createMockFileUploadItem({ id: "file-3" }),
      ];
      const currentBatch = createMockUploadBatch({ files });
      const initialState: UploadState = {
        previousBatches: [],
        currentBatch,
      };

      const action: UploadAction = {
        type: "REMOVE_FILE",
        fileId: "file-2",
      };

      const result = uploadReducer(initialState, action);

      expect(result.currentBatch?.files).toHaveLength(2);
      expect(result.currentBatch?.files[0].id).toBe("file-1");
      expect(result.currentBatch?.files[1].id).toBe("file-3");
    });

    it("should return unchanged state when no current batch exists", () => {
      const action: UploadAction = {
        type: "REMOVE_FILE",
        fileId: "file-1",
      };

      const result = uploadReducer(defaultUploadState, action);

      expect(result).toBe(defaultUploadState);
    });
  });

  describe("CLEAR_FILES", () => {
    it("should clear all files from current batch", () => {
      const files = [
        createMockFileUploadItem({ id: "file-1" }),
        createMockFileUploadItem({ id: "file-2" }),
      ];
      const currentBatch = createMockUploadBatch({ files });
      const initialState: UploadState = {
        previousBatches: [],
        currentBatch,
      };

      const action: UploadAction = {
        type: "CLEAR_FILES",
      };

      const result = uploadReducer(initialState, action);

      expect(result.currentBatch?.files).toEqual([]);
      expect(result.currentBatch?.importId).toBe(currentBatch.importId); // Other properties preserved
    });

    it("should return unchanged state when no current batch exists", () => {
      const action: UploadAction = {
        type: "CLEAR_FILES",
      };

      const result = uploadReducer(defaultUploadState, action);

      expect(result).toBe(defaultUploadState);
    });
  });

  describe("UPDATE_BATCH_STATUS", () => {
    it("should update all files in matching batch", () => {
      const files = [
        createMockFileUploadItem({ id: "file-1", status: "pending" }),
        createMockFileUploadItem({ id: "file-2", status: "pending" }),
      ];
      const currentBatch = createMockUploadBatch({
        importId: "test-import-1",
        files,
      });
      const initialState: UploadState = {
        previousBatches: [],
        currentBatch,
      };

      const action: UploadAction = {
        type: "UPDATE_BATCH_STATUS",
        importId: "test-import-1",
        status: "uploading",
        progress: 75,
      };

      const result = uploadReducer(initialState, action);

      expect(result.currentBatch?.files).toHaveLength(2);
      result.currentBatch?.files.forEach((file) => {
        expect(file.status).toBe("uploading");
        expect(file.progress).toBe(75);
      });
    });

    it("should update batch with error message", () => {
      const currentBatch = createMockUploadBatch({
        importId: "test-import-1",
        files: [createMockFileUploadItem()],
      });
      const initialState: UploadState = {
        previousBatches: [],
        currentBatch,
      };

      const action: UploadAction = {
        type: "UPDATE_BATCH_STATUS",
        importId: "test-import-1",
        status: "failed",
        error: "Network error",
      };

      const result = uploadReducer(initialState, action);

      result.currentBatch?.files.forEach((file) => {
        expect(file.status).toBe("failed");
        expect(file.error).toBe("Network error");
      });
    });

    it("should return unchanged state when import ID does not match", () => {
      const currentBatch = createMockUploadBatch({
        importId: "different-import-id",
      });
      const initialState: UploadState = {
        previousBatches: [],
        currentBatch,
      };

      const action: UploadAction = {
        type: "UPDATE_BATCH_STATUS",
        importId: "test-import-1",
        status: "uploading",
        progress: 50,
      };

      const result = uploadReducer(initialState, action);

      expect(result).toBe(initialState);
    });

    it("should return unchanged state when no current batch exists", () => {
      const action: UploadAction = {
        type: "UPDATE_BATCH_STATUS",
        importId: "test-import-1",
        status: "uploading",
        progress: 50,
      };

      const result = uploadReducer(defaultUploadState, action);

      expect(result).toBe(defaultUploadState);
    });
  });

  describe("COMPLETE_BATCH", () => {
    it("should move current batch to previous batches with success message", () => {
      const currentBatch = createMockUploadBatch();
      const existingBatch = createMockUploadBatch({
        importId: "existing-batch",
      });
      const initialState: UploadState = {
        previousBatches: [existingBatch],
        currentBatch,
      };

      const action: UploadAction = {
        type: "COMPLETE_BATCH",
        successMessage: "Upload completed successfully",
      };

      const result = uploadReducer(initialState, action);

      expect(result.currentBatch).toBeUndefined();
      expect(result.previousBatches).toHaveLength(2);
      expect(result.previousBatches[0]).toBe(existingBatch);
      expect(result.previousBatches[1]).toEqual({
        ...currentBatch,
        successMessage: "Upload completed successfully",
      });
    });

    it("should return unchanged state when no current batch exists", () => {
      const action: UploadAction = {
        type: "COMPLETE_BATCH",
        successMessage: "Success",
      };

      const result = uploadReducer(defaultUploadState, action);

      expect(result).toBe(defaultUploadState);
    });
  });

  describe("FAIL_BATCH", () => {
    it("should move current batch to previous batches with error message", () => {
      const currentBatch = createMockUploadBatch();
      const initialState: UploadState = {
        previousBatches: [],
        currentBatch,
      };

      const action: UploadAction = {
        type: "FAIL_BATCH",
        errorMessage: "Upload failed due to network error",
      };

      const result = uploadReducer(initialState, action);

      expect(result.currentBatch).toBeUndefined();
      expect(result.previousBatches).toHaveLength(1);
      expect(result.previousBatches[0]).toEqual({
        ...currentBatch,
        errorMessage: "Upload failed due to network error",
      });
    });

    it("should return unchanged state when no current batch exists", () => {
      const action: UploadAction = {
        type: "FAIL_BATCH",
        errorMessage: "Error",
      };

      const result = uploadReducer(defaultUploadState, action);

      expect(result).toBe(defaultUploadState);
    });
  });

  describe("RESET_CURRENT_BATCH", () => {
    it("should clear current batch while preserving previous batches", () => {
      const currentBatch = createMockUploadBatch();
      const previousBatch = createMockUploadBatch({ importId: "previous" });
      const initialState: UploadState = {
        previousBatches: [previousBatch],
        currentBatch,
      };

      const action: UploadAction = {
        type: "RESET_CURRENT_BATCH",
      };

      const result = uploadReducer(initialState, action);

      expect(result.currentBatch).toBeUndefined();
      expect(result.previousBatches).toEqual([previousBatch]);
    });
  });

  describe("CLEAR_ALL_BATCHES", () => {
    it("should clear all batches and current batch", () => {
      const currentBatch = createMockUploadBatch();
      const previousBatches = [
        createMockUploadBatch({ importId: "batch-1" }),
        createMockUploadBatch({ importId: "batch-2" }),
      ];
      const initialState: UploadState = {
        previousBatches,
        currentBatch,
      };

      const action: UploadAction = {
        type: "CLEAR_ALL_BATCHES",
      };

      const result = uploadReducer(initialState, action);

      expect(result.currentBatch).toBeUndefined();
      expect(result.previousBatches).toEqual([]);
    });
  });

  describe("default case", () => {
    it("should return unchanged state for unknown action", () => {
      const unknownAction = { type: "UNKNOWN_ACTION" } as any;

      const result = uploadReducer(defaultUploadState, unknownAction);

      expect(result).toBe(defaultUploadState);
    });
  });

  describe("defaultUploadState", () => {
    it("should have correct initial state", () => {
      expect(defaultUploadState).toEqual({
        previousBatches: [],
        currentBatch: undefined,
      });
    });
  });
});
