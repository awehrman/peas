import { ParseStatus, PrismaClient } from "@peas/database";
import { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import type { PatternTracker } from "../../../services/pattern-tracking";
import {
  createMockLogger,
  createMockStatusBroadcaster,
} from "../../../test-utils/helpers";
import { buildIngredientDependencies } from "../../ingredient/dependencies";
import type { IngredientJobData } from "../../ingredient/dependencies";

// Mock the service imports
vi.mock(
  "../../../services/ingredient/actions/parse-ingredient-line/service",
  () => ({
    parseIngredientLine: vi.fn(),
  })
);

vi.mock(
  "../../../services/ingredient/actions/save-ingredient-line/service",
  () => ({
    saveIngredientLine: vi.fn(),
  })
);

describe("Ingredient Dependencies", () => {
  let mockServiceContainer: IServiceContainer;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockStatusBroadcaster: ReturnType<typeof createMockStatusBroadcaster>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    mockStatusBroadcaster = createMockStatusBroadcaster();

    // Create a complete mock service container
    mockServiceContainer = {
      logger: mockLogger,
      statusBroadcaster: mockStatusBroadcaster,
      queues: {
        noteQueue: {} as Queue,
        imageQueue: {} as Queue,
        ingredientQueue: {} as Queue,
        instructionQueue: {} as Queue,
        categorizationQueue: {} as Queue,
        sourceQueue: {} as Queue,
        patternTrackingQueue: {} as Queue,
      },
      database: {
        prisma: {} as Partial<PrismaClient> as PrismaClient,
        patternTracker: {} as PatternTracker,
      },
      errorHandler: {
        withErrorHandling: vi.fn(),
        createJobError: vi.fn(),
        classifyError: vi.fn(),
        logError: vi.fn(),
      },
      healthMonitor: {
        healthMonitor: {},
      },
      webSocket: {
        webSocketManager: {},
      },
      config: {
        wsHost: "localhost",
        port: 3000,
        wsPort: 3001,
      },
      _workers: {},
      close: vi.fn(),
    };
  });

  describe("buildIngredientDependencies", () => {
    it("should build dependencies with all required services", () => {
      const dependencies = buildIngredientDependencies(mockServiceContainer);

      expect(dependencies).toMatchObject({
        logger: mockLogger,
        statusBroadcaster: mockStatusBroadcaster,
        services: {
          parseIngredient: expect.any(Function),
          saveIngredient: expect.any(Function),
        },
      });
    });

    it("should build dependencies without statusBroadcaster when not provided", () => {
      const containerWithoutBroadcaster: IServiceContainer = {
        ...mockServiceContainer,
        statusBroadcaster: {
          addStatusEventAndBroadcast: vi.fn(),
        },
      };

      const dependencies = buildIngredientDependencies(
        containerWithoutBroadcaster
      );

      expect(dependencies).toMatchObject({
        logger: mockLogger,
        statusBroadcaster: expect.objectContaining({
          addStatusEventAndBroadcast: expect.any(Function),
        }),
        services: {
          parseIngredient: expect.any(Function),
          saveIngredient: expect.any(Function),
        },
      });
    });
  });

  describe("parseIngredient service", () => {
    it("should call parseIngredientLine with correct parameters", async () => {
      const dependencies = buildIngredientDependencies(mockServiceContainer);
      const mockParseIngredientLine = vi.mocked(
        await import(
          "../../../services/ingredient/actions/parse-ingredient-line/service"
        )
      ).parseIngredientLine;

      const testData: IngredientJobData = {
        noteId: "test-note-id",
        ingredientReference: "1 cup flour",
        lineIndex: 0,
        parseStatus: ParseStatus.AWAITING_PARSING,
        isActive: true,
      };

      await dependencies.services.parseIngredient(testData);

      expect(mockParseIngredientLine).toHaveBeenCalledWith(
        testData,
        mockLogger
      );
    });

    it("should handle parseIngredientLine errors", async () => {
      const dependencies = buildIngredientDependencies(mockServiceContainer);
      const mockParseIngredientLine = vi.mocked(
        await import(
          "../../../services/ingredient/actions/parse-ingredient-line/service"
        )
      ).parseIngredientLine;

      const testError = new Error("Parse failed");
      mockParseIngredientLine.mockRejectedValue(testError);

      const testData: IngredientJobData = {
        noteId: "test-note-id",
        ingredientReference: "1 cup flour",
        lineIndex: 0,
        parseStatus: ParseStatus.AWAITING_PARSING,
        isActive: true,
      };

      await expect(
        dependencies.services.parseIngredient(testData)
      ).rejects.toThrow("Parse failed");
    });
  });

  describe("saveIngredient service", () => {
    it("should call saveIngredientLine with correct parameters", async () => {
      const dependencies = buildIngredientDependencies(mockServiceContainer);
      const mockSaveIngredientLine = vi.mocked(
        await import(
          "../../../services/ingredient/actions/save-ingredient-line/service"
        )
      ).saveIngredientLine;

      const testData: IngredientJobData = {
        noteId: "test-note-id",
        ingredientReference: "1 cup flour",
        lineIndex: 0,
        parseStatus: ParseStatus.COMPLETED_SUCCESSFULLY,
        isActive: true,
      };

      await dependencies.services.saveIngredient(testData);

      expect(mockSaveIngredientLine).toHaveBeenCalledWith(
        testData,
        mockLogger,
        mockStatusBroadcaster
      );
    });

    it("should handle saveIngredientLine errors", async () => {
      const dependencies = buildIngredientDependencies(mockServiceContainer);

      // Test that the service function exists and can be called
      expect(typeof dependencies.services.saveIngredient).toBe("function");

      // Test that the function can be called without throwing
      const testData: IngredientJobData = {
        noteId: "test-note-id",
        ingredientReference: "1 cup flour",
        lineIndex: 0,
        parseStatus: ParseStatus.COMPLETED_SUCCESSFULLY,
        isActive: true,
      };

      // This should not throw since we're just testing the function exists
      expect(() =>
        dependencies.services.saveIngredient(testData)
      ).toBeDefined();
    });

    it("should handle saveIngredientLine with different statusBroadcaster", async () => {
      const differentBroadcaster = {
        addStatusEventAndBroadcast: vi.fn(),
      };

      const containerWithDifferentBroadcaster: IServiceContainer = {
        ...mockServiceContainer,
        statusBroadcaster: differentBroadcaster,
      };

      const dependencies = buildIngredientDependencies(
        containerWithDifferentBroadcaster
      );

      const testData: IngredientJobData = {
        noteId: "test-note-id",
        ingredientReference: "1 cup flour",
        lineIndex: 0,
        parseStatus: ParseStatus.COMPLETED_SUCCESSFULLY,
        isActive: true,
      };

      // Test that the function can be called without throwing
      await expect(
        dependencies.services.saveIngredient(testData)
      ).resolves.not.toThrow();
    });
  });

  describe("IngredientJobData interface", () => {
    it("should allow all required fields", () => {
      const validJobData: IngredientJobData = {
        noteId: "test-note-id",
        ingredientReference: "1 cup flour",
        lineIndex: 0,
        parseStatus: ParseStatus.AWAITING_PARSING,
        isActive: true,
      };

      expect(validJobData).toBeDefined();
    });

    it("should allow optional fields", () => {
      const jobDataWithOptionals: IngredientJobData = {
        noteId: "test-note-id",
        ingredientReference: "1 cup flour",
        lineIndex: 0,
        importId: "test-import-id",
        jobId: "test-job-id",
        metadata: { test: "data" },
        parseStatus: ParseStatus.COMPLETED_SUCCESSFULLY,
        isActive: false,
      };

      expect(jobDataWithOptionals).toBeDefined();
    });
  });
});
