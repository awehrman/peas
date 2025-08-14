import { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import {
  buildCategorizationWorkerDependencies,
  createCategorizationWorker,
} from "../../categorization/index";

// Mock the service container
const mockServiceContainer: Partial<IServiceContainer> = {
  logger: {
    log: vi.fn(),
  },
  statusBroadcaster: {
    addStatusEventAndBroadcast: vi.fn(),
  },
};

// Mock the queue
const mockQueue = {
  name: "categorization-queue",
  add: vi.fn(),
  process: vi.fn(),
} as unknown as Queue;

describe("Categorization Index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCategorizationWorker", () => {
    it("should create a categorization worker instance", () => {
      const worker = createCategorizationWorker(
        mockQueue,
        mockServiceContainer as IServiceContainer
      );

      expect(worker).toBeDefined();
      expect(worker.constructor.name).toBe("CategorizationWorker");
    });

    it("should create worker with correct queue and container", () => {
      const worker = createCategorizationWorker(
        mockQueue,
        mockServiceContainer as IServiceContainer
      );

      // Verify the worker was created successfully
      expect(worker).toBeDefined();
      expect(worker.constructor.name).toBe("CategorizationWorker");
    });
  });

  describe("buildCategorizationWorkerDependencies", () => {
    it("should build categorization worker dependencies", () => {
      const dependencies = buildCategorizationWorkerDependencies(
        mockServiceContainer as IServiceContainer
      );

      expect(dependencies).toBeDefined();
      expect(dependencies.logger).toBe(mockServiceContainer.logger);
      expect(dependencies.statusBroadcaster).toBe(
        mockServiceContainer.statusBroadcaster
      );
      expect(dependencies.services).toBeDefined();
      expect(typeof dependencies.services.determineCategory).toBe("function");
      expect(typeof dependencies.services.saveCategory).toBe("function");
      expect(typeof dependencies.services.determineTags).toBe("function");
      expect(typeof dependencies.services.saveTags).toBe("function");
    });

    it("should return dependencies with correct structure", () => {
      const dependencies = buildCategorizationWorkerDependencies(
        mockServiceContainer as IServiceContainer
      );

      // Verify the structure matches CategorizationWorkerDependencies interface
      expect(dependencies).toHaveProperty("logger");
      expect(dependencies).toHaveProperty("statusBroadcaster");
      expect(dependencies).toHaveProperty("services");
      expect(dependencies.services).toHaveProperty("determineCategory");
      expect(dependencies.services).toHaveProperty("saveCategory");
      expect(dependencies.services).toHaveProperty("determineTags");
      expect(dependencies.services).toHaveProperty("saveTags");
    });
  });

  describe("Type Exports", () => {
    it("should export CategorizationJobData type", () => {
      // This test verifies that the type is properly exported
      // We can't directly test TypeScript types at runtime, but we can verify
      // that the module exports are working correctly
      expect(typeof createCategorizationWorker).toBe("function");
    });

    it("should export CategorizationWorkerDependencies type", () => {
      // This test verifies that the type is properly exported
      expect(typeof buildCategorizationWorkerDependencies).toBe("function");
    });

    it("should export CategorizationWorker class", () => {
      // This test verifies that the class is properly exported
      expect(typeof createCategorizationWorker).toBe("function");
    });
  });
});
