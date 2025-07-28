/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";

import * as WorkerDependenciesModule from "../../../core/worker-dependencies";

describe("Worker Dependencies Module", () => {
  describe("exports", () => {
    it("should export buildBaseDependencies function", () => {
      expect(WorkerDependenciesModule.buildBaseDependencies).toBeDefined();
      expect(typeof WorkerDependenciesModule.buildBaseDependencies).toBe(
        "function"
      );
    });

    it("should export buildLoggerDependency function", () => {
      expect(WorkerDependenciesModule.buildLoggerDependency).toBeDefined();
      expect(typeof WorkerDependenciesModule.buildLoggerDependency).toBe(
        "function"
      );
    });

    it("should export buildErrorHandlerDependency function", () => {
      expect(
        WorkerDependenciesModule.buildErrorHandlerDependency
      ).toBeDefined();
      expect(typeof WorkerDependenciesModule.buildErrorHandlerDependency).toBe(
        "function"
      );
    });

    it("should export buildStatusBroadcasterDependency function", () => {
      expect(
        WorkerDependenciesModule.buildStatusBroadcasterDependency
      ).toBeDefined();
      expect(
        typeof WorkerDependenciesModule.buildStatusBroadcasterDependency
      ).toBe("function");
    });
  });

  describe("function signatures", () => {
    it("should have correct buildBaseDependencies signature", () => {
      const { buildBaseDependencies } = WorkerDependenciesModule;
      expect(buildBaseDependencies.length).toBe(1); // One parameter: container
    });

    it("should have correct buildLoggerDependency signature", () => {
      const { buildLoggerDependency } = WorkerDependenciesModule;
      expect(buildLoggerDependency.length).toBe(1); // One parameter: container
    });

    it("should have correct buildErrorHandlerDependency signature", () => {
      const { buildErrorHandlerDependency } = WorkerDependenciesModule;
      expect(buildErrorHandlerDependency.length).toBe(1); // One parameter: container
    });

    it("should have correct buildStatusBroadcasterDependency signature", () => {
      const { buildStatusBroadcasterDependency } = WorkerDependenciesModule;
      expect(buildStatusBroadcasterDependency.length).toBe(1); // One parameter: container
    });
  });

  describe("module structure", () => {
    it("should export exactly 4 functions", () => {
      const exportedFunctions = Object.keys(WorkerDependenciesModule).filter(
        (key) =>
          typeof WorkerDependenciesModule[
            key as keyof typeof WorkerDependenciesModule
          ] === "function"
      );

      expect(exportedFunctions).toHaveLength(4);
      expect(exportedFunctions).toContain("buildBaseDependencies");
      expect(exportedFunctions).toContain("buildLoggerDependency");
      expect(exportedFunctions).toContain("buildErrorHandlerDependency");
      expect(exportedFunctions).toContain("buildStatusBroadcasterDependency");
    });

    it("should not export any non-function properties", () => {
      const allExports = Object.keys(WorkerDependenciesModule);
      const nonFunctionExports = allExports.filter(
        (key) =>
          typeof WorkerDependenciesModule[
            key as keyof typeof WorkerDependenciesModule
          ] !== "function"
      );

      expect(nonFunctionExports).toHaveLength(0);
    });
  });

  describe("function behavior", () => {
    it("should allow buildBaseDependencies to be called with container", () => {
      const { buildBaseDependencies } = WorkerDependenciesModule;
      const mockContainer = {
        logger: { log: () => {} },
        errorHandler: {
          withErrorHandling: () => Promise.resolve(),
          createJobError: () => ({}),
          classifyError: () => "",
          logError: () => {},
        },
        statusBroadcaster: {
          addStatusEventAndBroadcast: () => Promise.resolve(),
        },
        queues: {
          noteQueue: {},
          imageQueue: {},
          ingredientQueue: {},
          instructionQueue: {},
          categorizationQueue: {},
          sourceQueue: {},
        },
      } as any;

      expect(() => {
        buildBaseDependencies(mockContainer);
      }).not.toThrow();
    });

    it("should allow buildLoggerDependency to be called with container", () => {
      const { buildLoggerDependency } = WorkerDependenciesModule;
      const mockContainer = { logger: {} } as any;

      expect(() => {
        buildLoggerDependency(mockContainer);
      }).not.toThrow();
    });

    it("should allow buildErrorHandlerDependency to be called with container", () => {
      const { buildErrorHandlerDependency } = WorkerDependenciesModule;
      const mockContainer = { errorHandler: {} } as any;

      expect(() => {
        buildErrorHandlerDependency(mockContainer);
      }).not.toThrow();
    });

    it("should allow buildStatusBroadcasterDependency to be called with container", () => {
      const { buildStatusBroadcasterDependency } = WorkerDependenciesModule;
      const mockContainer = { statusBroadcaster: {} } as any;

      expect(() => {
        buildStatusBroadcasterDependency(mockContainer);
      }).not.toThrow();
    });
  });

  describe("integration", () => {
    it("should work together as a complete dependency builder system", () => {
      const {
        buildBaseDependencies,
        buildLoggerDependency,
        buildErrorHandlerDependency,
        buildStatusBroadcasterDependency,
      } = WorkerDependenciesModule;

      const mockContainer = {
        logger: { log: () => {} },
        errorHandler: {
          withErrorHandling: () => Promise.resolve(),
          createJobError: () => ({}),
          classifyError: () => "",
          logError: () => {},
        },
        statusBroadcaster: {
          addStatusEventAndBroadcast: () => Promise.resolve(),
        },
        queues: {
          noteQueue: {},
          imageQueue: {},
          ingredientQueue: {},
          instructionQueue: {},
          categorizationQueue: {},
          sourceQueue: {},
        },
      } as any;

      // Test that all functions can be called with the same container
      expect(() => {
        const baseDeps = buildBaseDependencies(mockContainer);
        const loggerDeps = buildLoggerDependency(mockContainer);
        const errorHandlerDeps = buildErrorHandlerDependency(mockContainer);
        const statusBroadcasterDeps =
          buildStatusBroadcasterDependency(mockContainer);

        // Verify that each returns a proper structure
        expect(baseDeps).toBeDefined();
        expect(loggerDeps).toBeDefined();
        expect(errorHandlerDeps).toBeDefined();
        expect(statusBroadcasterDeps).toBeDefined();
      }).not.toThrow();
    });

    it("should create independent dependency instances", () => {
      const { buildBaseDependencies } = WorkerDependenciesModule;
      const mockContainer = {
        logger: { log: () => {} },
        errorHandler: {
          withErrorHandling: () => Promise.resolve(),
          createJobError: () => ({}),
          classifyError: () => "",
          logError: () => {},
        },
        statusBroadcaster: {
          addStatusEventAndBroadcast: () => Promise.resolve(),
        },
        queues: {
          noteQueue: {},
          imageQueue: {},
          ingredientQueue: {},
          instructionQueue: {},
          categorizationQueue: {},
          sourceQueue: {},
        },
      } as any;

      const deps1 = buildBaseDependencies(mockContainer);
      const deps2 = buildBaseDependencies(mockContainer);

      expect(deps1).not.toBe(deps2);
      expect(deps1.logger).not.toBe(deps2.logger);
      expect(deps1.errorHandler).not.toBe(deps2.errorHandler);
      expect(deps1.statusBroadcaster).not.toBe(deps2.statusBroadcaster);
      expect(deps1.queues).not.toBe(deps2.queues);
    });
  });

  describe("error handling", () => {
    it("should handle buildLoggerDependency with invalid container", () => {
      const { buildLoggerDependency } = WorkerDependenciesModule;

      expect(() => {
        buildLoggerDependency(null as any);
      }).toThrow("Container not available for logger");

      expect(() => {
        buildLoggerDependency(undefined as any);
      }).toThrow("Container not available for logger");

      expect(() => {
        buildLoggerDependency({} as any);
      }).not.toThrow(); // Empty object is truthy, so it doesn't throw
    });

    it("should handle other builders with invalid containers gracefully", () => {
      const { buildErrorHandlerDependency, buildStatusBroadcasterDependency } =
        WorkerDependenciesModule;

      // These should not throw but may return undefined or empty objects
      expect(() => {
        buildErrorHandlerDependency(null as any);
      }).not.toThrow();

      expect(() => {
        buildStatusBroadcasterDependency(null as any);
      }).not.toThrow();
    });
  });
});
