import { describe, expect, it, vi } from "vitest";

import type {
  ILoggerService,
  IServiceContainer,
} from "../../../services/container";
import type { StructuredLogger } from "../../../types";
import {
  type PatternAnalysisJobData,
  type PatternTrackingJobData,
  type PatternTrackingWorkerDependencies,
  buildPatternTrackingDependencies,
} from "../../pattern-tracking/dependencies";

describe("PatternTrackingDependencies", () => {
  describe("interfaces", () => {
    it("should have correct PatternTrackingJobData structure", () => {
      const jobData: PatternTrackingJobData = {
        jobId: "test-job-id",
        patternRules: [
          { ruleId: "rule1", ruleNumber: 1 },
          { ruleId: "rule2", ruleNumber: 2 },
        ],
        exampleLine: "test example line",
        noteId: "note-id",
        importId: "import-id",
        metadata: { key: "value" },
      };

      expect(jobData.jobId).toBe("test-job-id");
      expect(jobData.patternRules).toHaveLength(2);
      expect(jobData.patternRules[0]).toEqual({
        ruleId: "rule1",
        ruleNumber: 1,
      });
      expect(jobData.exampleLine).toBe("test example line");
      expect(jobData.noteId).toBe("note-id");
      expect(jobData.importId).toBe("import-id");
      expect(jobData.metadata).toEqual({ key: "value" });
    });

    it("should have correct PatternAnalysisJobData structure", () => {
      const jobData: PatternAnalysisJobData = {
        jobId: "analysis-job-id",
        maxPatterns: 100,
        noteId: "note-id",
        importId: "import-id",
        metadata: { analysisType: "comprehensive" },
      };

      expect(jobData.jobId).toBe("analysis-job-id");
      expect(jobData.maxPatterns).toBe(100);
      expect(jobData.noteId).toBe("note-id");
      expect(jobData.importId).toBe("import-id");
      expect(jobData.metadata).toEqual({ analysisType: "comprehensive" });
    });

    it("should have correct PatternTrackingWorkerDependencies structure", () => {
      const mockLogger = { log: vi.fn() } as StructuredLogger;

      const dependencies: PatternTrackingWorkerDependencies = {
        logger: mockLogger,
      };

      expect(dependencies.logger).toBe(mockLogger);
    });
  });

  describe("buildPatternTrackingDependencies", () => {
    it("should build dependencies from service container", () => {
      // Arrange
      const mockLogger: ILoggerService = { log: vi.fn() };
      const mockServiceContainer: IServiceContainer = {
        logger: mockLogger,
      } as IServiceContainer;

      // Act
      const dependencies =
        buildPatternTrackingDependencies(mockServiceContainer);

      // Assert
      expect(dependencies).toEqual({
        logger: mockLogger,
      });
    });

    it("should extract logger from service container", () => {
      // Arrange
      const mockLogger: ILoggerService = {
        log: vi.fn(),
      };

      const mockServiceContainer: IServiceContainer = {
        logger: mockLogger,
        database: {} as IServiceContainer["database"],
        queues: {} as IServiceContainer["queues"],
        healthMonitor: {} as IServiceContainer["healthMonitor"],
        webSocket: {} as IServiceContainer["webSocket"],
        config: {} as IServiceContainer["config"],
        errorHandler: {} as IServiceContainer["errorHandler"],
        statusBroadcaster: {} as IServiceContainer["statusBroadcaster"],
        close: vi.fn(),
      };

      // Act
      const dependencies =
        buildPatternTrackingDependencies(mockServiceContainer);

      // Assert
      expect(dependencies.logger).toBe(mockLogger);
      expect(typeof dependencies.logger).toBe("object");
    });

    it("should return dependencies with correct types", () => {
      // Arrange
      const mockLogger: ILoggerService = { log: vi.fn() };
      const mockServiceContainer: IServiceContainer = {
        logger: mockLogger,
        database: {} as IServiceContainer["database"],
        queues: {} as IServiceContainer["queues"],
        healthMonitor: {} as IServiceContainer["healthMonitor"],
        webSocket: {} as IServiceContainer["webSocket"],
        config: {} as IServiceContainer["config"],
        errorHandler: {} as IServiceContainer["errorHandler"],
        statusBroadcaster: {} as IServiceContainer["statusBroadcaster"],
        close: vi.fn(),
      };

      // Act
      const dependencies =
        buildPatternTrackingDependencies(mockServiceContainer);

      // Assert
      expect(dependencies).toBeDefined();
      expect(dependencies.logger).toBeDefined();
      expect(dependencies).toHaveProperty("logger");
    });
  });

  describe("optional fields", () => {
    it("should allow PatternTrackingJobData with only required fields", () => {
      const minimalJobData: PatternTrackingJobData = {
        jobId: "minimal-job-id",
        patternRules: [{ ruleId: "rule1", ruleNumber: 1 }],
      };

      expect(minimalJobData.jobId).toBe("minimal-job-id");
      expect(minimalJobData.patternRules).toHaveLength(1);
      expect(minimalJobData.exampleLine).toBeUndefined();
      expect(minimalJobData.noteId).toBeUndefined();
      expect(minimalJobData.importId).toBeUndefined();
      expect(minimalJobData.metadata).toBeUndefined();
    });

    it("should allow PatternAnalysisJobData with only required fields", () => {
      const minimalJobData: PatternAnalysisJobData = {
        jobId: "minimal-analysis-job-id",
      };

      expect(minimalJobData.jobId).toBe("minimal-analysis-job-id");
      expect(minimalJobData.maxPatterns).toBeUndefined();
      expect(minimalJobData.noteId).toBeUndefined();
      expect(minimalJobData.importId).toBeUndefined();
      expect(minimalJobData.metadata).toBeUndefined();
    });

    it("should allow empty pattern rules array", () => {
      const jobData: PatternTrackingJobData = {
        jobId: "empty-rules-job",
        patternRules: [],
      };

      expect(jobData.patternRules).toHaveLength(0);
      expect(Array.isArray(jobData.patternRules)).toBe(true);
    });

    it("should allow complex metadata objects", () => {
      const complexMetadata = {
        nested: { data: "value" },
        array: [1, 2, 3],
        boolean: true,
        number: 42,
        nullValue: null,
      };

      const jobData: PatternTrackingJobData = {
        jobId: "complex-metadata-job",
        patternRules: [{ ruleId: "rule1", ruleNumber: 1 }],
        metadata: complexMetadata,
      };

      expect(jobData.metadata).toEqual(complexMetadata);
    });
  });
});
