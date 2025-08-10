import type { PrismaClient } from "@peas/database";
import type { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import { registerImageActions } from "../../../services/image";
import type { StructuredLogger } from "../../../types";
import type { ImageWorkerDependencies } from "../../image/types";
import { ImageWorker } from "../../image/worker";

// Mock the registerImageActions function
vi.mock("../../../services/image", () => ({
  registerImageActions: vi.fn(),
}));

describe("ImageWorker", () => {
  let mockQueue: Queue;
  let mockDependencies: ImageWorkerDependencies;
  let mockContainer: IServiceContainer;
  let mockLogger: StructuredLogger;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContainer = {
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
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      logger: {
        log: vi.fn(),
      },
      config: {},
      r2: {
        uploadFile: vi.fn(),
        uploadBuffer: vi.fn(),
        generatePresignedUploadUrl: vi.fn(),
        generatePresignedDownloadUrl: vi.fn(),
      },
      close: vi.fn(),
    } as IServiceContainer;

    mockLogger = {
      log: vi.fn(),
    } as StructuredLogger;

    mockDependencies = {
      serviceContainer: mockContainer,
      logger: mockLogger,
    };

    mockQueue = {
      name: "test-image-queue",
      add: vi.fn(),
      process: vi.fn(),
      close: vi.fn(),
      isRunning: vi.fn(() => true),
    } as unknown as Queue;
  });

  describe("constructor", () => {
    it("should create ImageWorker instance with valid parameters", () => {
      const imageWorker = new ImageWorker(mockQueue, mockDependencies);

      expect(imageWorker).toBeInstanceOf(ImageWorker);
      expect(registerImageActions).toHaveBeenCalled();
    });

    it("should handle queue with different name", () => {
      const customQueue = {
        ...mockQueue,
        name: "custom-queue",
      } as unknown as Queue;

      const worker = new ImageWorker(customQueue, mockDependencies);

      expect(worker).toBeInstanceOf(ImageWorker);
      expect(registerImageActions).toHaveBeenCalled();
    });

    it("should handle dependencies with different structure", () => {
      const customDependencies = {
        ...mockDependencies,
        customProp: "test",
      };

      const worker = new ImageWorker(mockQueue, customDependencies);

      expect(worker).toBeInstanceOf(ImageWorker);
      expect(registerImageActions).toHaveBeenCalled();
    });
  });

  describe("getOperationName", () => {
    it("should return correct operation name", () => {
      const imageWorker = new ImageWorker(mockQueue, mockDependencies);
      const operationName = (
        imageWorker as unknown as { getOperationName: () => string }
      ).getOperationName();
      expect(operationName).toBe("image-worker");
    });
  });
});
