import type { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import type { StructuredLogger } from "../../../types";
import { buildImageWorkerDependencies } from "../../image/dependencies";
import { PrismaClient } from "@prisma/client";

describe("Image Worker Dependencies", () => {
  let mockContainer: IServiceContainer;
  let mockLogger: StructuredLogger;
  let mockQueue: Queue;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    } as StructuredLogger;

    mockQueue = {
      add: vi.fn(),
      process: vi.fn(),
      close: vi.fn(),
      name: "test-queue",
    } as unknown as Queue;

    mockContainer = {
      logger: mockLogger,
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      queues: {
        noteQueue: mockQueue,
        imageQueue: mockQueue,
        ingredientQueue: mockQueue,
        instructionQueue: mockQueue,
        categorizationQueue: mockQueue,
        sourceQueue: mockQueue,
        patternTrackingQueue: mockQueue,
      },
      errorHandler: {
        withErrorHandling: vi.fn(),
        createJobError: vi.fn(),
        classifyError: vi.fn(),
        logError: vi.fn(),
      },
      database: {
        prisma: {} as unknown as PrismaClient,
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
      close: vi.fn(),
    } as IServiceContainer;
  });

  describe("buildImageWorkerDependencies", () => {
    it("should build dependencies successfully with valid container", () => {
      const dependencies = buildImageWorkerDependencies(mockContainer);

      expect(dependencies).toHaveProperty("serviceContainer");
      expect(dependencies).toHaveProperty("logger");
      expect(dependencies).toHaveProperty("statusBroadcaster");
      expect(dependencies).toHaveProperty("queues");
      expect(dependencies).toHaveProperty("errorHandler");
      expect(dependencies.serviceContainer).toBe(mockContainer);
    });

    it("should handle container without logger", () => {
      const containerWithoutLogger = {
        ...mockContainer,
        logger: undefined,
      } as unknown as IServiceContainer;

      const dependencies = buildImageWorkerDependencies(containerWithoutLogger);

      expect(dependencies).toHaveProperty("serviceContainer");
      expect(dependencies).toHaveProperty("logger");
      expect(dependencies.serviceContainer).toBe(containerWithoutLogger);
    });

    it("should handle null container", () => {
      expect(() => {
        buildImageWorkerDependencies(null as unknown as IServiceContainer);
      }).toThrow("Cannot read properties of null (reading 'queues')");
    });

    it("should handle undefined container", () => {
      expect(() => {
        buildImageWorkerDependencies(undefined as unknown as IServiceContainer);
      }).toThrow("Cannot read properties of undefined (reading 'queues')");
    });

    it("should return correct type structure", () => {
      const dependencies = buildImageWorkerDependencies(mockContainer);

      expect(dependencies).toHaveProperty("serviceContainer");
      expect(dependencies).toHaveProperty("logger");
      expect(dependencies).toHaveProperty("statusBroadcaster");
      expect(dependencies).toHaveProperty("queues");
      expect(dependencies).toHaveProperty("errorHandler");
      expect(typeof dependencies.serviceContainer).toBe("object");
      expect(dependencies.serviceContainer).toBe(mockContainer);
    });
  });
});
