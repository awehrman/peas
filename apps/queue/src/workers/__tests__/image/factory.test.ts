import type { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import type { StructuredLogger } from "../../../types";
import { createImageWorker } from "../../image/factory";
import type { ImageWorkerDependencies } from "../../image/types";

// Mock dependencies
vi.mock("../../image/dependencies");
vi.mock("../../image/worker");

// Mock console.log to capture output
const mockConsoleLog = vi.fn();

describe("Image Worker Factory", () => {
  let mockQueue: Queue;
  let mockContainer: IServiceContainer;
  let mockLogger: StructuredLogger;
  let mockDependencies: ImageWorkerDependencies;
  let mockImageWorker: unknown;

  beforeEach(async () => {
    vi.clearAllMocks();
    console.log = mockConsoleLog;

    mockLogger = {
      log: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    } as any;

    mockContainer = {
      logger: mockLogger,
      // Add other required properties as needed
    } as IServiceContainer;

    mockDependencies = {
      serviceContainer: mockContainer,
      logger: mockLogger,
    };

    mockQueue = {
      name: "test-image-queue",
    } as Queue;

    mockImageWorker = {
      constructor: vi.fn(),
    };

    // Setup mocks
    const { buildImageWorkerDependencies } = await import(
      "../../image/dependencies"
    );
    const { ImageWorker } = await import("../../image/worker");

    vi.mocked(buildImageWorkerDependencies).mockReturnValue(mockDependencies);
    vi.mocked(ImageWorker).mockImplementation(() => mockImageWorker as any);
  });

  describe("createImageWorker", () => {
    it("should create image worker successfully with valid inputs", () => {
      const worker = createImageWorker(mockQueue, mockContainer);

      expect(worker).toBe(mockImageWorker);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER_FACTORY] Creating image worker"
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER_FACTORY] Queue name:",
        "test-image-queue"
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER_FACTORY] Container services:",
        ["logger"]
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER_FACTORY] Dependencies built:",
        ["serviceContainer", "logger"]
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER_FACTORY] Image worker created successfully"
      );
    });

    it("should handle queue with different name", () => {
      const customQueue = {
        name: "custom-image-queue",
      } as Queue;

      createImageWorker(customQueue, mockContainer);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER_FACTORY] Queue name:",
        "custom-image-queue"
      );
    });

    it("should handle container with multiple services", () => {
      const containerWithServices = {
        logger: mockLogger,
        service1: {},
        service2: {},
      } as unknown as IServiceContainer;

      createImageWorker(mockQueue, containerWithServices);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER_FACTORY] Container services:",
        ["logger", "service1", "service2"]
      );
    });

    it("should handle empty container", () => {
      const emptyContainer = {} as IServiceContainer;

      createImageWorker(mockQueue, emptyContainer);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER_FACTORY] Container services:",
        []
      );
    });

    it("should call buildImageWorkerDependencies with correct container", async () => {
      const { buildImageWorkerDependencies } = await import(
        "../../image/dependencies"
      );

      createImageWorker(mockQueue, mockContainer);

      expect(vi.mocked(buildImageWorkerDependencies)).toHaveBeenCalledWith(
        mockContainer
      );
    });

    it("should create ImageWorker with correct parameters", async () => {
      const { ImageWorker } = await import("../../image/worker");

      createImageWorker(mockQueue, mockContainer);

      expect(vi.mocked(ImageWorker)).toHaveBeenCalledWith(
        mockQueue,
        mockDependencies
      );
    });

    it("should handle null queue", () => {
      expect(() =>
        createImageWorker(null as unknown as Queue, mockContainer)
      ).toThrow("Cannot read properties of null (reading 'name')");
    });

    it("should handle null container", () => {
      expect(() =>
        createImageWorker(mockQueue, null as unknown as IServiceContainer)
      ).toThrow("Cannot convert undefined or null to object");
    });

    it("should handle undefined queue", () => {
      expect(() => createImageWorker(undefined as unknown as Queue, mockContainer)).toThrow(
        "Cannot read properties of undefined (reading 'name')"
      );
    });

    it("should handle undefined container", () => {
      expect(() => createImageWorker(mockQueue, undefined as unknown as IServiceContainer)).toThrow(
        "Cannot convert undefined or null to object"
      );
    });
  });
});
