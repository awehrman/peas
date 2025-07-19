/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { IngredientWorker } from "../ingredient-worker";
import type { IngredientWorkerDependencies } from "../types";

describe("IngredientWorker Integration", () => {
  let worker: IngredientWorker;
  let mockDeps: IngredientWorkerDependencies;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a mock queue for the constructor
    const mockQueue = {
      add: vi.fn().mockResolvedValue({}),
    } as any;

    mockDeps = {
      logger: {
        log: vi.fn(),
      },
      parseIngredient: vi.fn(),
      database: {
        prisma: {
          parsedIngredientLine: {
            upsert: vi.fn().mockResolvedValue({ id: "test-line" }),
            update: vi.fn().mockResolvedValue({ id: "test-line" }),
            create: vi.fn().mockResolvedValue({ id: "test-line" }),
          },
          parsedSegment: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            createMany: vi.fn().mockResolvedValue({ count: 3 }),
          },
          ingredient: {
            findFirst: vi
              .fn()
              .mockResolvedValue({ id: "test-ingredient", name: "test" }),
            create: vi
              .fn()
              .mockResolvedValue({ id: "new-ingredient", name: "test" }),
          },
          ingredientReference: {
            create: vi.fn().mockResolvedValue({ id: "test-ref" }),
          },
        },
      },
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      ErrorHandler: {
        withErrorHandling: vi
          .fn()
          .mockImplementation(async (operation) => operation()),
      },
      categorizationQueue: {
        add: vi.fn().mockResolvedValue({}),
      },
    } as any;

    worker = new IngredientWorker(mockQueue, mockDeps);
  });

  describe("worker properties", () => {
    it("should have correct operation name", () => {
      // Access protected method through casting
      expect((worker as any).getOperationName()).toBe("ingredient_processing");
    });

    it("should register ingredient actions", () => {
      // Test that the worker can be instantiated and actions are registered
      expect(worker).toBeInstanceOf(IngredientWorker);
    });
  });

  describe("action pipeline creation", () => {
    it("should create action pipeline with ingredient tracking", () => {
      const jobData = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "3 tbsp. canola oil",
        blockIndex: 0,
        lineIndex: 0,
        importId: "test-import-789",
        currentIngredientIndex: 1,
        totalIngredients: 5,
      };

      const context = {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        timing: { startTime: Date.now(), duration: 0 },
        metadata: {},
      };

      const pipeline = (worker as any).createActionPipeline(jobData, context);

      // Should have the expected actions
      expect(pipeline.length).toBeGreaterThan(0);
    });

    it("should create action pipeline without ingredient tracking", () => {
      const jobData = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "3 tbsp. canola oil",
        blockIndex: 0,
        lineIndex: 0,
        // No importId or tracking info
      };

      const context = {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        timing: { startTime: Date.now(), duration: 0 },
        metadata: {},
      };

      const pipeline = (worker as any).createActionPipeline(jobData, context);

      // Should still have the core actions
      expect(pipeline.length).toBeGreaterThan(0);
    });
  });

  describe("status actions", () => {
    it("should skip generic status actions for ingredient processing", () => {
      const jobData = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "3 tbsp. canola oil",
        blockIndex: 0,
        lineIndex: 0,
      };

      const actions: any[] = [];

      (worker as any).addStatusActions(actions, jobData);

      // Should log that we're skipping generic status actions
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Skipping generic status actions")
      );
    });
  });
});
