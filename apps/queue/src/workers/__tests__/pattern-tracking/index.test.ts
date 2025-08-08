import { describe, expect, it } from "vitest";

import type { StructuredLogger } from "../../../types";
import {
  type PatternTrackingJobData,
  type PatternTrackingWorkerDependencies,
  buildPatternTrackingDependencies,
  createPatternTrackingWorker,
} from "../../pattern-tracking";

describe("Pattern Tracking Worker Index", () => {
  describe("exports", () => {
    it("should export createPatternTrackingWorker function", () => {
      expect(createPatternTrackingWorker).toBeDefined();
      expect(typeof createPatternTrackingWorker).toBe("function");
    });

    it("should export buildPatternTrackingDependencies function", () => {
      expect(buildPatternTrackingDependencies).toBeDefined();
      expect(typeof buildPatternTrackingDependencies).toBe("function");
    });

    it("should export PatternTrackingWorkerDependencies type", () => {
      // This is a compile-time check - if this compiles, the type is exported
      const dependencies: PatternTrackingWorkerDependencies = {
        logger: {
          log: () => {},
        } as StructuredLogger,
      };

      expect(dependencies).toBeDefined();
      expect(dependencies.logger).toBeDefined();
    });

    it("should export PatternTrackingJobData type", () => {
      // This is a compile-time check - if this compiles, the type is exported
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

      expect(jobData).toBeDefined();
      expect(jobData.jobId).toBe("test-job-id");
      expect(jobData.patternRules).toHaveLength(2);
    });
  });

  describe("module structure", () => {
    it("should have all expected exports available", () => {
      const moduleExports = {
        createPatternTrackingWorker,
        buildPatternTrackingDependencies,
      };

      expect(Object.keys(moduleExports)).toHaveLength(2);
      expect(moduleExports.createPatternTrackingWorker).toBeDefined();
      expect(moduleExports.buildPatternTrackingDependencies).toBeDefined();
    });

    it("should export functions that can be called", () => {
      expect(() => {
        const functionName1 = createPatternTrackingWorker.name;
        const functionName2 = buildPatternTrackingDependencies.name;

        expect(functionName1).toBe("createPatternTrackingWorker");
        expect(functionName2).toBe("buildPatternTrackingDependencies");
      }).not.toThrow();
    });
  });

  describe("type compatibility", () => {
    it("should have compatible PatternTrackingJobData with minimal required fields", () => {
      const minimalJobData: PatternTrackingJobData = {
        jobId: "minimal-job-id",
        patternRules: [],
      };

      expect(minimalJobData.jobId).toBe("minimal-job-id");
      expect(Array.isArray(minimalJobData.patternRules)).toBe(true);
      expect(minimalJobData.patternRules).toHaveLength(0);
    });

    it("should have compatible PatternTrackingJobData with all optional fields", () => {
      const fullJobData: PatternTrackingJobData = {
        jobId: "full-job-id",
        patternRules: [
          { ruleId: "rule1", ruleNumber: 1 },
          { ruleId: "rule2", ruleNumber: 2 },
          { ruleId: "rule3", ruleNumber: 3 },
        ],
        exampleLine: "Example ingredient line",
        noteId: "note-123",
        importId: "import-456",
        metadata: {
          source: "web-scraper",
          confidence: 0.95,
          timestamp: "2023-01-01T00:00:00Z",
          nested: {
            data: "value",
            array: [1, 2, 3],
          },
        },
      };

      expect(fullJobData.jobId).toBe("full-job-id");
      expect(fullJobData.patternRules).toHaveLength(3);
      expect(fullJobData.exampleLine).toBe("Example ingredient line");
      expect(fullJobData.noteId).toBe("note-123");
      expect(fullJobData.importId).toBe("import-456");
      expect(fullJobData.metadata).toBeDefined();
      expect(fullJobData.metadata?.source).toBe("web-scraper");
      expect(fullJobData.metadata?.confidence).toBe(0.95);
    });

    it("should have compatible PatternTrackingWorkerDependencies", () => {
      const mockLogger: StructuredLogger = {
        log: () => {},
      };

      const dependencies: PatternTrackingWorkerDependencies = {
        logger: mockLogger,
      };

      expect(dependencies.logger).toBe(mockLogger);
      expect(typeof dependencies.logger.log).toBe("function");
    });
  });

  describe("pattern rule validation", () => {
    it("should handle pattern rules with different structures", () => {
      const jobDataWithVariousRules: PatternTrackingJobData = {
        jobId: "various-rules-job",
        patternRules: [
          { ruleId: "short-rule", ruleNumber: 1 },
          { ruleId: "longer-rule-name-with-dashes", ruleNumber: 2 },
          { ruleId: "rule_with_underscores", ruleNumber: 3 },
          { ruleId: "RULE_WITH_CAPS", ruleNumber: 4 },
          { ruleId: "rule123", ruleNumber: 5 },
        ],
      };

      expect(jobDataWithVariousRules.patternRules).toHaveLength(5);

      jobDataWithVariousRules.patternRules.forEach((rule, index) => {
        expect(rule.ruleId).toBeDefined();
        expect(typeof rule.ruleId).toBe("string");
        expect(rule.ruleNumber).toBe(index + 1);
        expect(typeof rule.ruleNumber).toBe("number");
      });
    });

    it("should handle empty and single rule arrays", () => {
      const emptyRulesJob: PatternTrackingJobData = {
        jobId: "empty-rules",
        patternRules: [],
      };

      const singleRuleJob: PatternTrackingJobData = {
        jobId: "single-rule",
        patternRules: [{ ruleId: "only-rule", ruleNumber: 1 }],
      };

      expect(emptyRulesJob.patternRules).toHaveLength(0);
      expect(singleRuleJob.patternRules).toHaveLength(1);
      expect(singleRuleJob.patternRules[0]?.ruleId).toBe("only-rule");
      expect(singleRuleJob.patternRules[0]?.ruleNumber).toBe(1);
    });
  });

  describe("metadata handling", () => {
    it("should handle various metadata types", () => {
      const jobWithComplexMetadata: PatternTrackingJobData = {
        jobId: "complex-metadata-job",
        patternRules: [{ ruleId: "rule1", ruleNumber: 1 }],
        metadata: {
          string: "value",
          number: 42,
          boolean: true,
          null: null,
          undefined: undefined,
          array: [1, "two", { three: 3 }],
          object: {
            nested: {
              deeply: {
                value: "deep",
              },
            },
          },
          date: "2023-01-01T00:00:00Z",
        },
      };

      expect(jobWithComplexMetadata.metadata).toBeDefined();
      expect(jobWithComplexMetadata.metadata!.string).toBe("value");
      expect(jobWithComplexMetadata.metadata!.number).toBe(42);
      expect(jobWithComplexMetadata.metadata!.boolean).toBe(true);
      expect(jobWithComplexMetadata.metadata!.null).toBeNull();
      expect(Array.isArray(jobWithComplexMetadata.metadata?.array)).toBe(true);
      expect(typeof jobWithComplexMetadata.metadata?.object).toBe("object");
    });

    it("should handle undefined metadata", () => {
      const jobWithoutMetadata: PatternTrackingJobData = {
        jobId: "no-metadata-job",
        patternRules: [{ ruleId: "rule1", ruleNumber: 1 }],
        // metadata is undefined
      };

      expect(jobWithoutMetadata.metadata).toBeUndefined();
    });
  });
});
