import { describe, expect, it } from "vitest";

import {
  createTestJobMetadata,
  createTestParseResult,
  createTestParsedSegment,
  createTestProcessingOptions,
  createTestSourceData,
  testInvalidSchema,
  testSchemaDefaults,
  testSchemaPartialData,
  testSchemaRequiredFields,
  testValidSchema,
} from "../../test-utils/schema";
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
    testValidSchema(
      SourceSchema,
      createTestSourceData(),
      "valid source data with all fields"
    );

    testValidSchema(
      SourceSchema,
      {},
      "source with only required fields (empty object)"
    );

    testValidSchema(
      SourceSchema,
      createTestSourceData({ url: "https://example.com/recipe" }),
      "source with only URL"
    );

    testInvalidSchema(
      SourceSchema,
      createTestSourceData({ url: "not-a-valid-url" }),
      "Invalid URL format",
      "invalid URL"
    );
  });

  describe("ProcessingOptionsSchema", () => {
    testValidSchema(
      ProcessingOptionsSchema,
      createTestProcessingOptions({
        skipCategorization: true,
        skipImageProcessing: false,
        skipIngredientProcessing: true,
        skipInstructionProcessing: false,
        strictMode: true,
        allowPartial: false,
      }),
      "valid processing options"
    );

    testSchemaDefaults(
      ProcessingOptionsSchema,
      {},
      {
        skipCategorization: false,
        skipImageProcessing: false,
        skipIngredientProcessing: false,
        skipInstructionProcessing: false,
        strictMode: false,
        allowPartial: true,
      },
      "options are not provided"
    );

    testSchemaPartialData(
      ProcessingOptionsSchema,
      {
        skipCategorization: true,
        strictMode: true,
      },
      createTestProcessingOptions({
        skipCategorization: true,
        strictMode: true,
      }),
      "partial options with defaults"
    );
  });

  describe("JobMetadataSchema", () => {
    testValidSchema(
      JobMetadataSchema,
      createTestJobMetadata(),
      "valid job metadata with all fields"
    );

    testSchemaDefaults(
      JobMetadataSchema,
      {
        jobId: "job-123",
        workerName: "test-worker",
      },
      {
        attemptNumber: 1,
        maxRetries: 3,
        priority: 5,
        timeout: 30000,
      },
      "metadata is not provided"
    );

    testSchemaRequiredFields(JobMetadataSchema, ["jobId", "workerName"], {
      jobId: "job-123",
      workerName: "test-worker",
      attemptNumber: 1,
      maxRetries: 3,
      createdAt: new Date("2023-01-01"),
      priority: 5,
      timeout: 30000,
    });

    // Field validation tests are covered by the individual testInvalidSchema calls below

    testInvalidSchema(
      JobMetadataSchema,
      createTestJobMetadata({ jobId: "" }),
      "Job ID is required",
      "empty jobId"
    );

    testInvalidSchema(
      JobMetadataSchema,
      createTestJobMetadata({ priority: 0 }),
      "Priority must be between 1 and 10",
      "priority below 1"
    );

    testInvalidSchema(
      JobMetadataSchema,
      createTestJobMetadata({ priority: 11 }),
      "Priority must be between 1 and 10",
      "priority above 10"
    );

    testInvalidSchema(
      JobMetadataSchema,
      createTestJobMetadata({ timeout: -1000 }),
      "Timeout must be a positive integer",
      "negative timeout"
    );

    testInvalidSchema(
      JobMetadataSchema,
      createTestJobMetadata({ timeout: 0 }),
      "Timeout must be a positive integer",
      "zero timeout"
    );

    testInvalidSchema(
      JobMetadataSchema,
      createTestJobMetadata({ maxRetries: 11 }),
      "Too big: expected number to be <=10",
      "maxRetries above 10"
    );
  });

  describe("BaseJobDataSchema", () => {
    testValidSchema(
      BaseJobDataSchema,
      {
        metadata: createTestJobMetadata(),
        source: createTestSourceData(),
        options: createTestProcessingOptions(),
        createdAt: new Date("2023-01-01"),
      },
      "valid base job data with all fields"
    );

    testValidSchema(
      BaseJobDataSchema,
      {},
      "minimal base job data (empty object)"
    );

    testValidSchema(
      BaseJobDataSchema,
      {
        metadata: createTestJobMetadata(),
      },
      "job data with only metadata"
    );
  });

  describe("StatusEventSchema", () => {
    testValidSchema(
      StatusEventSchema,
      {
        jobId: "job-123",
        status: "PROCESSING" as const,
        message: "Processing started",
        timestamp: new Date("2023-01-01"),
        metadata: { progress: 50 },
        errorCode: "TIMEOUT",
        errorDetails: { reason: "Operation timed out" },
      },
      "valid status event with all fields"
    );

    testSchemaDefaults(
      StatusEventSchema,
      {
        jobId: "job-123",
        status: "COMPLETED" as const,
        message: "Job completed",
      },
      {},
      "timestamp is not provided"
    );

    testSchemaRequiredFields(
      StatusEventSchema,
      ["jobId", "status", "message"],
      {
        jobId: "job-123",
        status: "PROCESSING" as const,
        message: "Processing started",
      }
    );

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

    testInvalidSchema(
      StatusEventSchema,
      {
        jobId: "",
        status: "PROCESSING" as const,
        message: "Processing started",
      },
      "Job ID is required",
      "empty jobId"
    );

    testInvalidSchema(
      StatusEventSchema,
      {
        jobId: "job-123",
        status: "INVALID_STATUS" as never,
        message: "Processing started",
      },
      undefined,
      "invalid status"
    );

    testInvalidSchema(
      StatusEventSchema,
      {
        jobId: "job-123",
        status: "PROCESSING" as const,
        message: "",
      },
      "Status message is required",
      "empty message"
    );
  });

  describe("ErrorContextSchema", () => {
    testValidSchema(
      ErrorContextSchema,
      {
        jobId: "job-123",
        operation: "parse_html",
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        workerName: "test-worker",
        attemptNumber: 2,
        errorCode: "PARSE_ERROR",
        errorMessage: "Failed to parse HTML",
        errorDetails: { line: 10, column: 5 },
        timestamp: new Date("2023-01-01"),
      },
      "valid error context with all fields"
    );

    testSchemaDefaults(
      ErrorContextSchema,
      {
        jobId: "job-123",
        operation: "parse_html",
      },
      {},
      "timestamp is not provided"
    );

    testSchemaRequiredFields(ErrorContextSchema, ["jobId", "operation"], {
      jobId: "job-123",
      operation: "parse_html",
    });

    // Field validation tests are covered by the individual testInvalidSchema calls below

    testInvalidSchema(
      ErrorContextSchema,
      {
        jobId: "job-123",
        operation: "parse_html",
        noteId: "invalid-uuid",
      },
      undefined,
      "invalid UUID for noteId"
    );

    testInvalidSchema(
      ErrorContextSchema,
      {
        jobId: "job-123",
        operation: "parse_html",
        attemptNumber: -1,
      },
      undefined,
      "negative attemptNumber"
    );

    testInvalidSchema(
      ErrorContextSchema,
      {
        jobId: "job-123",
        operation: "parse_html",
        attemptNumber: 0,
      },
      undefined,
      "zero attemptNumber"
    );
  });

  describe("ParsedSegmentSchema", () => {
    testValidSchema(
      ParsedSegmentSchema,
      createTestParsedSegment(),
      "valid parsed segment with all fields"
    );

    testValidSchema(
      ParsedSegmentSchema,
      {
        index: 0,
        rule: "amount_rule",
        type: "amount" as const,
        value: "1 cup",
      },
      "segment without optional fields"
    );

    testSchemaRequiredFields(
      ParsedSegmentSchema,
      ["index", "rule", "type", "value"],
      {
        index: 0,
        rule: "amount_rule",
        type: "amount" as const,
        value: "1 cup",
      }
    );

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

    testInvalidSchema(
      ParsedSegmentSchema,
      {
        index: 0,
        rule: "",
        type: "amount" as const,
        value: "1 cup",
      },
      "Rule is required",
      "empty rule"
    );

    testInvalidSchema(
      ParsedSegmentSchema,
      {
        index: 0,
        rule: "amount_rule",
        type: "invalid_type" as never,
        value: "1 cup",
      },
      undefined,
      "invalid type"
    );

    testInvalidSchema(
      ParsedSegmentSchema,
      {
        index: 0,
        rule: "amount_rule",
        type: "amount" as const,
        value: "",
      },
      "Value is required",
      "empty value"
    );

    testInvalidSchema(
      ParsedSegmentSchema,
      {
        index: 0,
        rule: "amount_rule",
        type: "amount" as const,
        value: "1 cup",
        processingTime: -100,
      },
      undefined,
      "negative processingTime"
    );
  });

  describe("ParseResultSchema", () => {
    testValidSchema(
      ParseResultSchema,
      createTestParseResult(),
      "valid parse result with all fields"
    );

    testValidSchema(
      ParseResultSchema,
      {
        success: false,
        parseStatus: "ERROR" as const,
        segments: [],
        errorMessage: "Failed to parse ingredient",
        processingTime: 100,
        metadata: { errorType: "syntax" },
      },
      "failed parse result"
    );

    testValidSchema(
      ParseResultSchema,
      {
        success: true,
        parseStatus: "PENDING" as const,
        processingTime: 0,
      },
      "minimal parse result"
    );

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

    testInvalidSchema(
      ParseResultSchema,
      {
        success: true,
        parseStatus: "INVALID_STATUS" as never,
        processingTime: 100,
      },
      undefined,
      "invalid parseStatus"
    );

    testInvalidSchema(
      ParseResultSchema,
      {
        success: true,
        parseStatus: "CORRECT" as const,
        processingTime: -100,
      },
      undefined,
      "negative processingTime"
    );
  });

  describe("BaseValidation", () => {
    describe("validate", () => {
      it("should validate valid data", () => {
        const validData = createTestJobMetadata();
        const result = BaseValidation.validate(JobMetadataSchema, validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid data", () => {
        const invalidData = { jobId: "", workerName: "test-worker" };
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
          metadata: createTestJobMetadata(),
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
