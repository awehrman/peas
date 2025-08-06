/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../../services/container";
import { buildStatusBroadcasterDependency } from "../../../core/worker-dependencies/build-status-broadcaster-dependency";

describe("buildStatusBroadcasterDependency", () => {
  let mockContainer: IServiceContainer;

  beforeEach(() => {
    mockContainer = {
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn() as any,
      },
    } as unknown as IServiceContainer;
  });

  describe("addStatusEventAndBroadcast", () => {
    it("should delegate addStatusEventAndBroadcast calls to container statusBroadcaster", async () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);
      const testEvent = {
        importId: "test-import",
        noteId: "test-note",
        status: "PROCESSING",
        message: "Test message",
        context: "test-context",
        indentLevel: 1,
        metadata: { jobId: "test-job" },
      };

      await statusBroadcaster.addStatusEventAndBroadcast(testEvent);

      expect(
        mockContainer.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          ...testEvent,
          type: "status",
          severity: "info",
        })
      );
    });

    it("should use default values when event properties are missing", async () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);
      const testEvent = {};

      await statusBroadcaster.addStatusEventAndBroadcast(testEvent);

      expect(
        mockContainer.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "status",
          message: "",
          severity: "info",
        })
      );
    });

    it("should handle custom type and severity values", async () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);
      const testEvent = {
        type: "custom-type",
        severity: "error" as const,
        message: "Custom message",
      };

      await statusBroadcaster.addStatusEventAndBroadcast(testEvent);

      expect(
        mockContainer.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "custom-type",
          message: "Custom message",
          severity: "error",
        })
      );
    });

    it("should handle all severity levels", async () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);
      const severityLevels = ["info", "warn", "error", "critical"] as const;

      for (const severity of severityLevels) {
        const testEvent = { severity };
        await statusBroadcaster.addStatusEventAndBroadcast(testEvent);

        expect(
          mockContainer.statusBroadcaster.addStatusEventAndBroadcast
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            severity,
          })
        );
      }
    });

    it("should handle invalid severity values", async () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);
      const testEvent = { severity: "invalid" };

      await statusBroadcaster.addStatusEventAndBroadcast(testEvent);

      expect(
        mockContainer.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: "invalid", // The implementation uses || so it keeps the original value
        })
      );
    });

    it("should preserve all event properties", async () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);
      const testEvent = {
        importId: "test-import",
        noteId: "test-note",
        status: "PROCESSING",
        message: "Test message",
        context: "test-context",
        indentLevel: 1,
        metadata: { jobId: "test-job" },
        customProp: "custom-value",
        nested: { key: "value" },
      };

      await statusBroadcaster.addStatusEventAndBroadcast(testEvent);

      expect(
        mockContainer.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          ...testEvent,
          type: "status",
          severity: "info",
        })
      );
    });

    it("should handle event with only type specified", async () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);
      const testEvent = { type: "processing" };

      await statusBroadcaster.addStatusEventAndBroadcast(testEvent);

      expect(
        mockContainer.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "processing",
          message: "",
          severity: "info",
        })
      );
    });

    it("should handle event with only message specified", async () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);
      const testEvent = { message: "Processing started" };

      await statusBroadcaster.addStatusEventAndBroadcast(testEvent);

      expect(
        mockContainer.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "status",
          message: "Processing started",
          severity: "info",
        })
      );
    });

    it("should handle event with only severity specified", async () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);
      const testEvent = { severity: "warn" as const };

      await statusBroadcaster.addStatusEventAndBroadcast(testEvent);

      expect(
        mockContainer.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "status",
          message: "",
          severity: "warn",
        })
      );
    });

    it("should handle complex nested event data", async () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);
      const testEvent = {
        importId: "test-import",
        noteId: "test-note",
        status: "PROCESSING",
        message: "Test message",
        context: "test-context",
        indentLevel: 1,
        metadata: {
          jobId: "test-job",
          userId: "test-user",
          timestamp: "2023-01-01T00:00:00Z",
          nested: {
            level1: {
              level2: {
                level3: "deep-value",
              },
            },
          },
        },
        progress: {
          current: 50,
          total: 100,
          percentage: 50,
        },
        errors: [
          { code: "ERR001", message: "Error 1" },
          { code: "ERR002", message: "Error 2" },
        ],
      };

      await statusBroadcaster.addStatusEventAndBroadcast(testEvent);

      expect(
        mockContainer.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          ...testEvent,
          type: "status",
          severity: "info",
        })
      );
    });

    it("should handle async operation completion", async () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);
      const testEvent = {
        type: "completion",
        message: "Operation completed successfully",
        severity: "info" as const,
        importId: "test-import",
        noteId: "test-note",
        status: "COMPLETED",
        processingTime: 1500,
        result: {
          success: true,
          processedItems: 10,
          skippedItems: 0,
        },
      };

      await statusBroadcaster.addStatusEventAndBroadcast(testEvent);

      expect(
        mockContainer.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "completion",
          message: "Operation completed successfully",
          severity: "info",
          importId: "test-import",
          noteId: "test-note",
          status: "COMPLETED",
          processingTime: 1500,
          result: {
            success: true,
            processedItems: 10,
            skippedItems: 0,
          },
        })
      );
    });

    it("should handle error events", async () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);
      const testEvent = {
        type: "error",
        message: "An error occurred during processing",
        severity: "error" as const,
        importId: "test-import",
        noteId: "test-note",
        status: "COMPLETED_WITH_ERROR",
        error: {
          name: "ValidationError",
          message: "Invalid input data",
          stack: "Error stack trace...",
        },
        context: "ingredient-parsing",
      };

      await statusBroadcaster.addStatusEventAndBroadcast(testEvent);

      expect(
        mockContainer.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          message: "An error occurred during processing",
          severity: "error",
          importId: "test-import",
          noteId: "test-note",
          status: "COMPLETED_WITH_ERROR",
          error: {
            name: "ValidationError",
            message: "Invalid input data",
            stack: "Error stack trace...",
          },
          context: "ingredient-parsing",
        })
      );
    });
  });

  describe("complete status broadcaster structure", () => {
    it("should return complete status broadcaster with addStatusEventAndBroadcast method", () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);

      expect(statusBroadcaster).toEqual({
        addStatusEventAndBroadcast: expect.any(Function),
      });
    });

    it("should create new instances on each call", () => {
      const statusBroadcaster1 =
        buildStatusBroadcasterDependency(mockContainer);
      const statusBroadcaster2 =
        buildStatusBroadcasterDependency(mockContainer);

      expect(statusBroadcaster1).not.toBe(statusBroadcaster2);
      expect(statusBroadcaster1.addStatusEventAndBroadcast).not.toBe(
        statusBroadcaster2.addStatusEventAndBroadcast
      );
    });
  });

  describe("edge cases", () => {
    it("should handle event with null values", async () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);
      const testEvent = {
        type: null,
        message: null,
        severity: null,
        importId: null,
      };

      await statusBroadcaster.addStatusEventAndBroadcast(testEvent);

      expect(
        mockContainer.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: null, // The implementation uses || so it keeps the original value
          message: null, // The implementation uses || so it keeps the original value
          severity: null, // The implementation uses || so it keeps the original value
          importId: null,
        })
      );
    });

    it("should handle event with undefined values", async () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);
      const testEvent = {
        type: undefined,
        message: undefined,
        severity: undefined,
        importId: undefined,
      };

      await statusBroadcaster.addStatusEventAndBroadcast(testEvent);

      expect(
        mockContainer.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: undefined, // The implementation uses || so it keeps the original value
          message: undefined, // The implementation uses || so it keeps the original value
          severity: undefined, // The implementation uses || so it keeps the original value
          importId: undefined,
        })
      );
    });

    it("should handle event with non-string type", async () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);
      const testEvent = {
        type: 123,
        message: "Test message",
      };

      await statusBroadcaster.addStatusEventAndBroadcast(testEvent);

      expect(
        mockContainer.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 123, // The implementation uses || so it keeps the original value
          message: "Test message",
          severity: "info",
        })
      );
    });

    it("should handle event with non-string message", async () => {
      const statusBroadcaster = buildStatusBroadcasterDependency(mockContainer);
      const testEvent = {
        type: "test",
        message: 456,
      };

      await statusBroadcaster.addStatusEventAndBroadcast(testEvent);

      expect(
        mockContainer.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "test",
          message: 456, // The implementation uses || so it keeps the original value
          severity: "info",
        })
      );
    });
  });
});
