import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import type { StructuredLogger } from "../../../types";
import { buildImageWorkerDependencies } from "../../image/dependencies";

// Mock console.log to capture output
const mockConsoleLog = vi.fn();

describe("Image Worker Dependencies", () => {
  let mockContainer: IServiceContainer;
  let mockLogger: StructuredLogger;

  beforeEach(() => {
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
  });

  describe("buildImageWorkerDependencies", () => {
    it("should build dependencies successfully with valid container", () => {
      const dependencies = buildImageWorkerDependencies(mockContainer);

      expect(dependencies).toEqual({
        serviceContainer: mockContainer,
        logger: mockLogger,
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER_DEPS] Building image worker dependencies"
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER_DEPS] Container available:",
        true
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER_DEPS] Logger available:",
        true
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER_DEPS] Dependencies built successfully"
      );
    });

    it("should handle container without logger", () => {
      const containerWithoutLogger = {
        ...mockContainer,
        logger: undefined,
      } as unknown as IServiceContainer;

      const dependencies = buildImageWorkerDependencies(containerWithoutLogger);

      expect(dependencies).toEqual({
        serviceContainer: containerWithoutLogger,
        logger: undefined,
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER_DEPS] Logger available:",
        false
      );
    });

    it("should handle null container", () => {
      expect(() => {
        buildImageWorkerDependencies(null as unknown as IServiceContainer);
      }).toThrow("Cannot read properties of null (reading 'logger')");
    });

    it("should handle undefined container", () => {
      expect(() => {
        buildImageWorkerDependencies(undefined as unknown as IServiceContainer);
      }).toThrow("Cannot read properties of undefined (reading 'logger')");
    });

    it("should return correct type structure", () => {
      const dependencies = buildImageWorkerDependencies(mockContainer);

      expect(dependencies).toHaveProperty("serviceContainer");
      expect(dependencies).toHaveProperty("logger");
      expect(typeof dependencies.serviceContainer).toBe("object");
      expect(dependencies.logger).toBe(mockLogger);
    });
  });
});
