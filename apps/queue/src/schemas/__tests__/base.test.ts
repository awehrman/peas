import { describe, expect, it } from "vitest";

import {
  BaseJobDataSchema,
  BaseValidation,
  ErrorContextSchema,
  JobMetadataSchema,
  ParseResultSchema,
  ParsedSegmentSchema,
  ProcessingOptionsSchema,
  SourceSchema,
  StatusEventSchema,
} from "../base";

describe("Base Schemas", () => {
  describe("SourceSchema", () => {
    it("should validate valid source data", () => {
      const validSource = {
        url: "https://example.com/recipe",
        filename: "recipe.html",
        contentType: "text/html",
        metadata: { author: "John Doe" },
      };

      const result = SourceSchema.safeParse(validSource);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validSource);
      }
    });

    it("should validate source with only required fields", () => {
      const minimalSource = {};

      const result = SourceSchema.safeParse(minimalSource);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(minimalSource);
      }
    });

    it("should reject invalid URL", () => {
      const invalidSource = {
        url: "not-a-valid-url",
      };

      const result = SourceSchema.safeParse(invalidSource);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe("Invalid URL format");
      }
    });

    it("should validate source with only URL", () => {
      const sourceWithUrl = {
        url: "https://example.com/recipe",
      };

      const result = SourceSchema.safeParse(sourceWithUrl);
      expect(result.success).toBe(true);
    });
  });

  describe("ProcessingOptionsSchema", () => {
    it("should validate valid processing options", () => {
      const validOptions = {
        skipCategorization: true,
        skipImageProcessing: false,
        skipIngredientProcessing: true,
        skipInstructionProcessing: false,
        strictMode: true,
        allowPartial: false,
      };

      const result = ProcessingOptionsSchema.safeParse(validOptions);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validOptions);
      }
    });

    it("should use default values when options are not provided", () => {
      const emptyOptions = {};

      const result = ProcessingOptionsSchema.safeParse(emptyOptions);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          skipCategorization: false,
          skipImageProcessing: false,
          skipIngredientProcessing: false,
          skipInstructionProcessing: false,
          strictMode: false,
          allowPartial: true,
        });
      }
    });

    it("should validate partial options with defaults", () => {
      const partialOptions = {
        skipCategorization: true,
        strictMode: true,
      };

      const result = ProcessingOptionsSchema.safeParse(partialOptions);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          skipCategorization: true,
          skipImageProcessing: false,
          skipIngredientProcessing: false,
          skipInstructionProcessing: false,
          strictMode: true,
          allowPartial: true,
        });
      }
    });
  });

  describe("JobMetadataSchema", () => {
    it("should validate valid job metadata", () => {
      const validMetadata = {
        jobId: "job-123",
        workerName: "test-worker",
        attemptNumber: 1,
        maxRetries: 3,
        createdAt: new Date("2023-01-01"),
        priority: 5,
        timeout: 30000,
      };

      const result = JobMetadataSchema.safeParse(validMetadata);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.jobId).toBe("job-123");
        expect(result.data.workerName).toBe("test-worker");
        expect(result.data.priority).toBe(5);
      }
    });

    it("should use default values when metadata is not provided", () => {
      const minimalMetadata = {
        jobId: "job-123",
        workerName: "test-worker",
      };

      const result = JobMetadataSchema.safeParse(minimalMetadata);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.attemptNumber).toBe(1);
        expect(result.data.maxRetries).toBe(3);
        expect(result.data.priority).toBe(5);
        expect(result.data.timeout).toBe(30000);
        expect(result.data.createdAt).toBeInstanceOf(Date);
      }
    });

    it("should reject missing jobId", () => {
      const invalidMetadata = {
        workerName: "test-worker",
      };

      const result = JobMetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject empty jobId", () => {
      const invalidMetadata = {
        jobId: "",
        workerName: "test-worker",
      };

      const result = JobMetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe("Job ID is required");
      }
    });

    it("should reject missing workerName", () => {
      const invalidMetadata = {
        jobId: "job-123",
      };

      const result = JobMetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject priority below 1", () => {
      const invalidMetadata = {
        jobId: "job-123",
        workerName: "test-worker",
        priority: 0,
      };

      const result = JobMetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Priority must be between 1 and 10"
        );
      }
    });

    it("should reject priority above 10", () => {
      const invalidMetadata = {
        jobId: "job-123",
        workerName: "test-worker",
        priority: 11,
      };

      const result = JobMetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Priority must be between 1 and 10"
        );
      }
    });

    it("should reject negative timeout", () => {
      const invalidMetadata = {
        jobId: "job-123",
        workerName: "test-worker",
        timeout: -1000,
      };

      const result = JobMetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Timeout must be a positive integer"
        );
      }
    });

    it("should reject zero timeout", () => {
      const invalidMetadata = {
        jobId: "job-123",
        workerName: "test-worker",
        timeout: 0,
      };

      const result = JobMetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Timeout must be a positive integer"
        );
      }
    });

    it("should reject maxRetries above 10", () => {
      const invalidMetadata = {
        jobId: "job-123",
        workerName: "test-worker",
        maxRetries: 11,
      };

      const result = JobMetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Too big: expected number to be <=10"
        );
      }
    });
  });

  describe("BaseJobDataSchema", () => {
    it("should validate valid base job data", () => {
      const validJobData = {
        metadata: {
          jobId: "job-123",
          workerName: "test-worker",
          attemptNumber: 1,
          maxRetries: 3,
          createdAt: new Date("2023-01-01"),
          priority: 5,
          timeout: 30000,
        },
        source: {
          url: "https://example.com/recipe",
          filename: "recipe.html",
        },
        options: {
          skipCategorization: true,
          skipImageProcessing: false,
          skipIngredientProcessing: false,
          skipInstructionProcessing: false,
          strictMode: true,
          allowPartial: true,
        },
        createdAt: new Date("2023-01-01"),
      };

      const result = BaseJobDataSchema.safeParse(validJobData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validJobData);
      }
    });

    it("should validate minimal base job data", () => {
      const minimalJobData = {};

      const result = BaseJobDataSchema.safeParse(minimalJobData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(minimalJobData);
      }
    });

    it("should validate job data with only metadata", () => {
      const jobDataWithMetadata = {
        metadata: {
          jobId: "job-123",
          workerName: "test-worker",
        },
      };

      const result = BaseJobDataSchema.safeParse(jobDataWithMetadata);
      expect(result.success).toBe(true);
    });
  });

  describe("StatusEventSchema", () => {
    it("should validate valid status event", () => {
      const validStatusEvent = {
        jobId: "job-123",
        status: "PROCESSING" as const,
        message: "Processing started",
        timestamp: new Date("2023-01-01"),
        metadata: { progress: 50 },
        errorCode: "TIMEOUT",
        errorDetails: { reason: "Operation timed out" },
      };

      const result = StatusEventSchema.safeParse(validStatusEvent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validStatusEvent);
      }
    });

    it("should use default timestamp when not provided", () => {
      const statusEventWithoutTimestamp = {
        jobId: "job-123",
        status: "COMPLETED" as const,
        message: "Job completed",
      };

      const result = StatusEventSchema.safeParse(statusEventWithoutTimestamp);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timestamp).toBeInstanceOf(Date);
        expect(result.data.jobId).toBe("job-123");
        expect(result.data.status).toBe("COMPLETED");
        expect(result.data.message).toBe("Job completed");
      }
    });

    it("should reject missing jobId", () => {
      const invalidStatusEvent = {
        status: "PROCESSING" as const,
        message: "Processing started",
      };

      const result = StatusEventSchema.safeParse(invalidStatusEvent);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject empty jobId", () => {
      const invalidStatusEvent = {
        jobId: "",
        status: "PROCESSING" as const,
        message: "Processing started",
      };

      const result = StatusEventSchema.safeParse(invalidStatusEvent);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe("Job ID is required");
      }
    });

    it("should reject missing status", () => {
      const invalidStatusEvent = {
        jobId: "job-123",
        message: "Processing started",
      };

      const result = StatusEventSchema.safeParse(invalidStatusEvent);
      expect(result.success).toBe(false);
    });

    it("should reject invalid status", () => {
      const invalidStatusEvent = {
        jobId: "job-123",
        status: "INVALID_STATUS" as never,
        message: "Processing started",
      };

      const result = StatusEventSchema.safeParse(invalidStatusEvent);
      expect(result.success).toBe(false);
    });

    it("should reject missing message", () => {
      const invalidStatusEvent = {
        jobId: "job-123",
        status: "PROCESSING" as const,
      };

      const result = StatusEventSchema.safeParse(invalidStatusEvent);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject empty message", () => {
      const invalidStatusEvent = {
        jobId: "job-123",
        status: "PROCESSING" as const,
        message: "",
      };

      const result = StatusEventSchema.safeParse(invalidStatusEvent);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Status message is required"
        );
      }
    });

    it("should validate all status values", () => {
      const statuses = [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
      ] as const;

      statuses.forEach((status) => {
        const statusEvent = {
          jobId: "job-123",
          status,
          message: "Test message",
        };

        const result = StatusEventSchema.safeParse(statusEvent);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(status);
        }
      });
    });
  });

  describe("ErrorContextSchema", () => {
    it("should validate valid error context", () => {
      const validErrorContext = {
        jobId: "job-123",
        operation: "parse_html",
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        workerName: "test-worker",
        attemptNumber: 2,
        errorCode: "PARSE_ERROR",
        errorMessage: "Failed to parse HTML",
        errorDetails: { line: 10, column: 5 },
        timestamp: new Date("2023-01-01"),
      };

      const result = ErrorContextSchema.safeParse(validErrorContext);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validErrorContext);
      }
    });

    it("should use default timestamp when not provided", () => {
      const errorContextWithoutTimestamp = {
        jobId: "job-123",
        operation: "parse_html",
      };

      const result = ErrorContextSchema.safeParse(errorContextWithoutTimestamp);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timestamp).toBeInstanceOf(Date);
        expect(result.data.jobId).toBe("job-123");
        expect(result.data.operation).toBe("parse_html");
      }
    });

    it("should reject missing jobId", () => {
      const invalidErrorContext = {
        operation: "parse_html",
      };

      const result = ErrorContextSchema.safeParse(invalidErrorContext);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject missing operation", () => {
      const invalidErrorContext = {
        jobId: "job-123",
      };

      const result = ErrorContextSchema.safeParse(invalidErrorContext);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject invalid UUID for noteId", () => {
      const invalidErrorContext = {
        jobId: "job-123",
        operation: "parse_html",
        noteId: "invalid-uuid",
      };

      const result = ErrorContextSchema.safeParse(invalidErrorContext);
      expect(result.success).toBe(false);
    });

    it("should reject negative attemptNumber", () => {
      const invalidErrorContext = {
        jobId: "job-123",
        operation: "parse_html",
        attemptNumber: -1,
      };

      const result = ErrorContextSchema.safeParse(invalidErrorContext);
      expect(result.success).toBe(false);
    });

    it("should reject zero attemptNumber", () => {
      const invalidErrorContext = {
        jobId: "job-123",
        operation: "parse_html",
        attemptNumber: 0,
      };

      const result = ErrorContextSchema.safeParse(invalidErrorContext);
      expect(result.success).toBe(false);
    });
  });

  describe("ParsedSegmentSchema", () => {
    it("should validate valid parsed segment", () => {
      const validSegment = {
        index: 0,
        rule: "amount_rule",
        type: "amount" as const,
        value: "1 cup",
        processingTime: 150,
        metadata: { confidence: 0.95 },
      };

      const result = ParsedSegmentSchema.safeParse(validSegment);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validSegment);
      }
    });

    it("should validate segment without optional fields", () => {
      const minimalSegment = {
        index: 0,
        rule: "amount_rule",
        type: "amount" as const,
        value: "1 cup",
      };

      const result = ParsedSegmentSchema.safeParse(minimalSegment);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(minimalSegment);
      }
    });

    it("should reject negative index", () => {
      const invalidSegment = {
        index: -1,
        rule: "amount_rule",
        type: "amount" as const,
        value: "1 cup",
      };

      const result = ParsedSegmentSchema.safeParse(invalidSegment);
      expect(result.success).toBe(false);
    });

    it("should reject empty rule", () => {
      const invalidSegment = {
        index: 0,
        rule: "",
        type: "amount" as const,
        value: "1 cup",
      };

      const result = ParsedSegmentSchema.safeParse(invalidSegment);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe("Rule is required");
      }
    });

    it("should reject missing rule", () => {
      const invalidSegment = {
        index: 0,
        type: "amount" as const,
        value: "1 cup",
      };

      const result = ParsedSegmentSchema.safeParse(invalidSegment);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject invalid type", () => {
      const invalidSegment = {
        index: 0,
        rule: "amount_rule",
        type: "invalid_type" as never,
        value: "1 cup",
      };

      const result = ParsedSegmentSchema.safeParse(invalidSegment);
      expect(result.success).toBe(false);
    });

    it("should reject empty value", () => {
      const invalidSegment = {
        index: 0,
        rule: "amount_rule",
        type: "amount" as const,
        value: "",
      };

      const result = ParsedSegmentSchema.safeParse(invalidSegment);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe("Value is required");
      }
    });

    it("should reject missing value", () => {
      const invalidSegment = {
        index: 0,
        rule: "amount_rule",
        type: "amount" as const,
      };

      const result = ParsedSegmentSchema.safeParse(invalidSegment);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject negative processingTime", () => {
      const invalidSegment = {
        index: 0,
        rule: "amount_rule",
        type: "amount" as const,
        value: "1 cup",
        processingTime: -100,
      };

      const result = ParsedSegmentSchema.safeParse(invalidSegment);
      expect(result.success).toBe(false);
    });

    it("should validate all segment types", () => {
      const types = [
        "amount",
        "unit",
        "ingredient",
        "modifier",
        "instruction",
        "note",
      ] as const;

      types.forEach((type) => {
        const segment = {
          index: 0,
          rule: "test_rule",
          type,
          value: "test value",
        };

        const result = ParsedSegmentSchema.safeParse(segment);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe(type);
        }
      });
    });
  });

  describe("ParseResultSchema", () => {
    it("should validate valid parse result", () => {
      const validParseResult = {
        success: true,
        parseStatus: "CORRECT" as const,
        segments: [
          {
            index: 0,
            rule: "amount_rule",
            type: "amount" as const,
            value: "1 cup",
          },
        ],
        errorMessage: undefined,
        processingTime: 250,
        metadata: { confidence: 0.9 },
      };

      const result = ParseResultSchema.safeParse(validParseResult);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validParseResult);
      }
    });

    it("should validate failed parse result", () => {
      const failedParseResult = {
        success: false,
        parseStatus: "ERROR" as const,
        segments: [],
        errorMessage: "Failed to parse ingredient",
        processingTime: 100,
        metadata: { errorType: "syntax" },
      };

      const result = ParseResultSchema.safeParse(failedParseResult);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(failedParseResult);
      }
    });

    it("should validate minimal parse result", () => {
      const minimalParseResult = {
        success: true,
        parseStatus: "PENDING" as const,
        processingTime: 0,
      };

      const result = ParseResultSchema.safeParse(minimalParseResult);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(minimalParseResult);
      }
    });

    it("should reject negative processingTime", () => {
      const invalidParseResult = {
        success: true,
        parseStatus: "CORRECT" as const,
        processingTime: -100,
      };

      const result = ParseResultSchema.safeParse(invalidParseResult);
      expect(result.success).toBe(false);
    });

    it("should reject invalid parseStatus", () => {
      const invalidParseResult = {
        success: true,
        parseStatus: "INVALID_STATUS" as never,
        processingTime: 100,
      };

      const result = ParseResultSchema.safeParse(invalidParseResult);
      expect(result.success).toBe(false);
    });

    it("should validate all parse status values", () => {
      const statuses = ["PENDING", "CORRECT", "INCORRECT", "ERROR"] as const;

      statuses.forEach((status) => {
        const parseResult = {
          success: status === "CORRECT",
          parseStatus: status,
          processingTime: 100,
        };

        const result = ParseResultSchema.safeParse(parseResult);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.parseStatus).toBe(status);
        }
      });
    });
  });

  describe("BaseValidation", () => {
    describe("validate", () => {
      it("should validate valid data", () => {
        const validData = {
          jobId: "job-123",
          workerName: "test-worker",
          attemptNumber: 1,
          maxRetries: 3,
          createdAt: new Date("2023-01-01"),
          priority: 5,
          timeout: 30000,
        };

        const result = BaseValidation.validate(JobMetadataSchema, validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid data", () => {
        const invalidData = {
          jobId: "",
          workerName: "test-worker",
        };

        const result = BaseValidation.validate(JobMetadataSchema, invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect((result as { success: false; error: string }).error).toContain(
            "jobId: Job ID is required"
          );
        }
      });

      it("should return multiple errors for multiple validation failures", () => {
        const invalidData = {
          jobId: "",
          workerName: "",
        };

        const result = BaseValidation.validate(JobMetadataSchema, invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect((result as { success: false; error: string }).error).toContain(
            "jobId: Job ID is required"
          );
          expect((result as { success: false; error: string }).error).toContain(
            "workerName: Worker name is required"
          );
        }
      });

      it("should handle nested validation errors", () => {
        const invalidData = {
          metadata: {
            jobId: "",
            workerName: "test-worker",
          },
        };

        const result = BaseValidation.validate(BaseJobDataSchema, invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect((result as { success: false; error: string }).error).toContain(
            "metadata.jobId: Job ID is required"
          );
        }
      });
    });

    describe("validateBaseJobData", () => {
      it("should validate valid base job data", () => {
        const validData = {
          metadata: {
            jobId: "job-123",
            workerName: "test-worker",
            attemptNumber: 1,
            maxRetries: 3,
            createdAt: new Date("2023-01-01"),
            priority: 5,
            timeout: 30000,
          },
        };

        const result = BaseValidation.validateBaseJobData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid base job data", () => {
        const invalidData = {
          metadata: {
            jobId: "",
            workerName: "test-worker",
          },
        };

        const result = BaseValidation.validateBaseJobData(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect((result as { success: false; error: string }).error).toContain(
            "metadata.jobId: Job ID is required"
          );
        }
      });
    });

    describe("validateStatusEvent", () => {
      it("should validate valid status event", () => {
        const validData = {
          jobId: "job-123",
          status: "PROCESSING" as const,
          message: "Processing started",
          timestamp: new Date("2023-01-01"),
        };

        const result = BaseValidation.validateStatusEvent(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid status event", () => {
        const invalidData = {
          jobId: "",
          status: "PROCESSING" as const,
          message: "Processing started",
        };

        const result = BaseValidation.validateStatusEvent(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect((result as { success: false; error: string }).error).toContain(
            "jobId: Job ID is required"
          );
        }
      });
    });

    describe("validateErrorContext", () => {
      it("should validate valid error context", () => {
        const validData = {
          jobId: "job-123",
          operation: "parse_html",
          timestamp: new Date("2023-01-01"),
        };

        const result = BaseValidation.validateErrorContext(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid error context", () => {
        const invalidData = {
          jobId: "",
          operation: "parse_html",
        };

        const result = BaseValidation.validateErrorContext(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect((result as { success: false; error: string }).error).toContain(
            "jobId: Job ID is required"
          );
        }
      });
    });

    describe("validateParseResult", () => {
      it("should validate valid parse result", () => {
        const validData = {
          success: true,
          parseStatus: "CORRECT" as const,
          processingTime: 100,
        };

        const result = BaseValidation.validateParseResult(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid parse result", () => {
        const invalidData = {
          success: true,
          parseStatus: "SUCCESS" as const,
          processingTime: -100,
        };

        const result = BaseValidation.validateParseResult(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect((result as { success: false; error: string }).error).toContain(
            "processingTime: Too small: expected number to be >=0"
          );
        }
      });
    });
  });
});
