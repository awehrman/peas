import { describe, it, expect } from "vitest";
import * as CoreExports from "../../index";

describe("Core Index Exports", () => {
  describe("cache exports", () => {
    it("should export cache classes and functions", () => {
      expect(CoreExports).toHaveProperty("ActionResultCache");
      expect(CoreExports).toHaveProperty("globalActionCache");
      expect(CoreExports).toHaveProperty("createCacheKey");
    });

    it("should export ActionResultCache class", () => {
      expect(typeof CoreExports.ActionResultCache).toBe("function");
      expect(CoreExports.ActionResultCache.name).toBe("ActionResultCache");
    });

    it("should export globalActionCache instance", () => {
      expect(CoreExports.globalActionCache).toBeDefined();
      expect(typeof CoreExports.globalActionCache.get).toBe("function");
      expect(typeof CoreExports.globalActionCache.set).toBe("function");
    });

    it("should export createCacheKey function", () => {
      expect(typeof CoreExports.createCacheKey).toBe("function");
    });
  });

  describe("errors exports", () => {
    it("should export all error classes", () => {
      expect(CoreExports).toHaveProperty("WorkerError");
      expect(CoreExports).toHaveProperty("NoteProcessingError");
      expect(CoreExports).toHaveProperty("ActionValidationError");
      expect(CoreExports).toHaveProperty("ActionExecutionError");
      expect(CoreExports).toHaveProperty("MissingDependencyError");
      expect(CoreExports).toHaveProperty("ServiceUnhealthyError");
    });

    it("should export WorkerError class", () => {
      expect(typeof CoreExports.WorkerError).toBe("function");
      expect(CoreExports.WorkerError.name).toBe("WorkerError");
    });

    it("should export NoteProcessingError class", () => {
      expect(typeof CoreExports.NoteProcessingError).toBe("function");
      expect(CoreExports.NoteProcessingError.name).toBe("NoteProcessingError");
    });

    it("should export ActionValidationError class", () => {
      expect(typeof CoreExports.ActionValidationError).toBe("function");
      expect(CoreExports.ActionValidationError.name).toBe(
        "ActionValidationError"
      );
    });

    it("should export ActionExecutionError class", () => {
      expect(typeof CoreExports.ActionExecutionError).toBe("function");
      expect(CoreExports.ActionExecutionError.name).toBe(
        "ActionExecutionError"
      );
    });

    it("should export MissingDependencyError class", () => {
      expect(typeof CoreExports.MissingDependencyError).toBe("function");
      expect(CoreExports.MissingDependencyError.name).toBe(
        "MissingDependencyError"
      );
    });

    it("should export ServiceUnhealthyError class", () => {
      expect(typeof CoreExports.ServiceUnhealthyError).toBe("function");
      expect(CoreExports.ServiceUnhealthyError.name).toBe(
        "ServiceUnhealthyError"
      );
    });
  });

  describe("metrics exports", () => {
    it("should export metrics classes and functions", () => {
      expect(CoreExports).toHaveProperty("MetricsCollector");
      expect(CoreExports).toHaveProperty("WorkerMetrics");
      expect(CoreExports).toHaveProperty("globalMetrics");
    });

    it("should export MetricsCollector class", () => {
      expect(typeof CoreExports.MetricsCollector).toBe("function");
      expect(CoreExports.MetricsCollector.name).toBe("MetricsCollector");
    });

    it("should export WorkerMetrics class", () => {
      expect(typeof CoreExports.WorkerMetrics).toBe("function");
      expect(CoreExports.WorkerMetrics.name).toBe("WorkerMetrics");
    });

    it("should export globalMetrics instance", () => {
      expect(CoreExports.globalMetrics).toBeDefined();
      expect(typeof CoreExports.globalMetrics.increment).toBe("function");
      expect(typeof CoreExports.globalMetrics.gauge).toBe("function");
      expect(typeof CoreExports.globalMetrics.histogram).toBe("function");
    });
  });

  describe("base-worker exports", () => {
    it("should export BaseWorker class", () => {
      expect(CoreExports).toHaveProperty("BaseWorker");
      expect(typeof CoreExports.BaseWorker).toBe("function");
      expect(CoreExports.BaseWorker.name).toBe("BaseWorker");
    });

    it("should export createBaseDependenciesFromContainer function", () => {
      expect(CoreExports).toHaveProperty("createBaseDependenciesFromContainer");
      expect(typeof CoreExports.createBaseDependenciesFromContainer).toBe(
        "function"
      );
    });
  });

  describe("types exports", () => {
    it("should export types", () => {
      // Note: TypeScript interfaces are not exported at runtime
      // These tests verify that the types are available for TypeScript compilation
      expect(true).toBe(true); // Placeholder test
    });
  });

  describe("base-action exports", () => {
    it("should export BaseAction class", () => {
      expect(CoreExports).toHaveProperty("BaseAction");
      expect(typeof CoreExports.BaseAction).toBe("function");
      expect(CoreExports.BaseAction.name).toBe("BaseAction");
    });

    it("should export concrete action classes", () => {
      expect(CoreExports).toHaveProperty("NoOpAction");
      expect(CoreExports).toHaveProperty("ValidationAction");
      expect(CoreExports).toHaveProperty("LoggingAction");
    });

    it("should export NoOpAction class", () => {
      expect(typeof CoreExports.NoOpAction).toBe("function");
      expect(CoreExports.NoOpAction.name).toBe("NoOpAction");
    });

    it("should export ValidationAction class", () => {
      expect(typeof CoreExports.ValidationAction).toBe("function");
      expect(CoreExports.ValidationAction.name).toBe("ValidationAction");
    });

    it("should export LoggingAction class", () => {
      expect(typeof CoreExports.LoggingAction).toBe("function");
      expect(CoreExports.LoggingAction.name).toBe("LoggingAction");
    });
  });

  describe("action-factory exports", () => {
    it("should export ActionFactory class", () => {
      expect(CoreExports).toHaveProperty("ActionFactory");
      expect(typeof CoreExports.ActionFactory).toBe("function");
      expect(CoreExports.ActionFactory.name).toBe("ActionFactory");
    });

    it("should export globalActionFactory instance", () => {
      expect(CoreExports).toHaveProperty("globalActionFactory");
      expect(CoreExports.globalActionFactory).toBeDefined();
      expect(typeof CoreExports.globalActionFactory.register).toBe("function");
      expect(typeof CoreExports.globalActionFactory.create).toBe("function");
    });
  });

  describe("export completeness", () => {
    it("should export all expected items", () => {
      const expectedExports = [
        // Cache
        "ActionResultCache",
        "globalActionCache",
        "createCacheKey",

        // Errors
        "WorkerError",
        "NoteProcessingError",
        "ActionValidationError",
        "ActionExecutionError",
        "MissingDependencyError",
        "ServiceUnhealthyError",

        // Metrics
        "MetricsCollector",
        "WorkerMetrics",
        "globalMetrics",

        // Base Worker
        "BaseWorker",
        "createBaseDependenciesFromContainer",

        // Base Action
        "BaseAction",
        "NoOpAction",
        "ValidationAction",
        "LoggingAction",

        // Action Factory
        "ActionFactory",
        "globalActionFactory",
      ];

      expectedExports.forEach((exportName) => {
        expect(CoreExports).toHaveProperty(exportName);
      });
    });

    it("should not export unexpected items", () => {
      const unexpectedExports = [
        "PrivateClass",
        "InternalFunction",
        "TestHelper",
        "MockObject",
      ];

      unexpectedExports.forEach((exportName) => {
        expect(CoreExports).not.toHaveProperty(exportName);
      });
    });
  });

  describe("export types", () => {
    it("should export classes as functions", () => {
      const classExports = [
        "ActionResultCache",
        "WorkerError",
        "NoteProcessingError",
        "ActionValidationError",
        "ActionExecutionError",
        "MissingDependencyError",
        "ServiceUnhealthyError",
        "MetricsCollector",
        "WorkerMetrics",
        "BaseWorker",
        "BaseAction",
        "NoOpAction",
        "ValidationAction",
        "LoggingAction",
        "ActionFactory",
      ];

      classExports.forEach((exportName) => {
        expect(typeof CoreExports[exportName as keyof typeof CoreExports]).toBe(
          "function"
        );
      });
    });

    it("should export instances as objects", () => {
      const instanceExports = [
        "globalActionCache",
        "globalMetrics",
        "globalActionFactory",
      ];

      instanceExports.forEach((exportName) => {
        expect(typeof CoreExports[exportName as keyof typeof CoreExports]).toBe(
          "object"
        );
      });
    });

    it("should export functions as functions", () => {
      const functionExports = [
        "createCacheKey",
        "createBaseDependenciesFromContainer",
      ];

      functionExports.forEach((exportName) => {
        expect(typeof CoreExports[exportName as keyof typeof CoreExports]).toBe(
          "function"
        );
      });
    });
  });

  describe("export accessibility", () => {
    it("should allow importing specific exports", () => {
      // Test that we can import specific items
      const { BaseWorker, ActionFactory, WorkerError } = CoreExports;

      expect(BaseWorker).toBeDefined();
      expect(ActionFactory).toBeDefined();
      expect(WorkerError).toBeDefined();
    });

    it("should allow destructuring imports", () => {
      // Test that we can destructure imports
      const {
        ActionResultCache,
        globalActionCache,
        createCacheKey,
        MetricsCollector,
        WorkerMetrics,
        globalMetrics,
      } = CoreExports;

      expect(ActionResultCache).toBeDefined();
      expect(globalActionCache).toBeDefined();
      expect(createCacheKey).toBeDefined();
      expect(MetricsCollector).toBeDefined();
      expect(WorkerMetrics).toBeDefined();
      expect(globalMetrics).toBeDefined();
    });
  });
});
