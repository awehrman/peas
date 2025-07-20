import { describe, it, expect } from "vitest";
import { validateJobData } from "../../error-handler";
import { ErrorType, ErrorSeverity } from "../../../types";

describe("validateJobData (exported function)", () => {
  describe("Valid Data", () => {
    it("should return null for valid data with note", () => {
      const data = { note: "test note content" };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });

    it("should return null for valid data with note and additional fields", () => {
      const data = {
        note: "test note content",
        userId: "user-123",
        priority: "high",
        metadata: { tags: ["tag1", "tag2"] },
      };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });

    it("should return error for data with empty note string", () => {
      const data = { note: "" };

      const result = validateJobData(data);

      expect(result).not.toBeNull();
      expect(result?.message).toBe("Invalid job data: missing note");
      expect(result?.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result?.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should return error for data with falsy but defined note", () => {
      const data = { note: 0 };

      const result = validateJobData(data);

      expect(result).not.toBeNull();
      expect(result?.message).toBe("Invalid job data: missing note");
      expect(result?.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result?.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should return error for data with boolean note", () => {
      const data = { note: false };

      const result = validateJobData(data);

      expect(result).not.toBeNull();
      expect(result?.message).toBe("Invalid job data: missing note");
      expect(result?.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result?.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should return null for data with array note", () => {
      const data = { note: [1, 2, 3] };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });

    it("should return null for data with object note", () => {
      const data = { note: { content: "test" } };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });
  });

  describe("Invalid Data", () => {
    it("should return error for missing note field", () => {
      const data = { userId: "user-123", priority: "high" };

      const result = validateJobData(data);

      expect(result).not.toBeNull();
      expect(result?.message).toBe("Invalid job data: missing note");
      expect(result?.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result?.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should return error for undefined note", () => {
      const data = { note: undefined, userId: "user-123" };

      const result = validateJobData(data);

      expect(result).not.toBeNull();
      expect(result?.message).toBe("Invalid job data: missing note");
      expect(result?.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result?.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should return error for null note", () => {
      const data = { note: null, userId: "user-123" };

      const result = validateJobData(data);

      expect(result).not.toBeNull();
      expect(result?.message).toBe("Invalid job data: missing note");
      expect(result?.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result?.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should return error for empty object", () => {
      const data = {};

      const result = validateJobData(data);

      expect(result).not.toBeNull();
      expect(result?.message).toBe("Invalid job data: missing note");
      expect(result?.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result?.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should return error for null data", () => {
      const data = null;

      const result = validateJobData(
        data as unknown as Record<string, unknown>
      );

      expect(result).not.toBeNull();
      expect(result?.message).toBe("Invalid job data: missing note");
      expect(result?.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result?.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should return error for undefined data", () => {
      const data = undefined;

      const result = validateJobData(
        data as unknown as Record<string, unknown>
      );

      expect(result).not.toBeNull();
      expect(result?.message).toBe("Invalid job data: missing note");
      expect(result?.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result?.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe("Error Object Properties", () => {
    it("should create error with correct properties", () => {
      const data = { userId: "user-123" };

      const result = validateJobData(data);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.message).toBe("Invalid job data: missing note");
        expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
        expect(result.severity).toBe(ErrorSeverity.MEDIUM);
        expect(result.timestamp).toBeInstanceOf(Date);
      }
    });

    it("should set current timestamp", () => {
      const data = { userId: "user-123" };
      const beforeCall = new Date();

      const result = validateJobData(data);

      const afterCall = new Date();
      expect(result?.timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime()
      );
      expect(result?.timestamp.getTime()).toBeLessThanOrEqual(
        afterCall.getTime()
      );
    });

    it("should create unique timestamps for different calls", async () => {
      const data1 = { userId: "user-123" };
      const data2 = { userId: "user-456" };

      const result1 = validateJobData(data1);
      await new Promise((r) => setTimeout(r, 2));
      const result2 = validateJobData(data2);

      expect(result1?.timestamp).not.toEqual(result2?.timestamp);
    });
  });

  describe("Edge Cases", () => {
    it("should handle data with only note field", () => {
      const data = { note: "test note" };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });

    it("should handle data with note as first field", () => {
      const data = { note: "test note", userId: "user-123" };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });

    it("should handle data with note as last field", () => {
      const data = { userId: "user-123", note: "test note" };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });

    it("should handle data with very long note", () => {
      const longNote = "a".repeat(10000);
      const data = { note: longNote };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });

    it("should handle data with note containing special characters", () => {
      const data = { note: "Note with special chars: \n\t\r\"'\\" };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });

    it("should handle data with note containing unicode characters", () => {
      const data = { note: "Note with unicode: 🚨❌⚠️ℹ️" };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });

    it("should handle data with very large object", () => {
      const largeData = {
        note: "test note",
        ...Array.from({ length: 1000 }, (_, i) => ({
          [`field${i}`]: `value${i}`,
        })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
      };

      const result = validateJobData(largeData);

      expect(result).toBeNull();
    });

    it("should handle data with circular references", () => {
      const circularObj: Record<string, unknown> = { note: "test note" };
      circularObj.self = circularObj;

      const result = validateJobData(circularObj);

      expect(result).toBeNull();
    });
  });

  describe("Data Type Handling", () => {
    it("should handle string note", () => {
      const data = { note: "string note" };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });

    it("should handle number note", () => {
      const data = { note: 42 };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });

    it("should handle boolean note", () => {
      const data = { note: true };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });

    it("should handle array note", () => {
      const data = { note: [1, 2, 3] };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });

    it("should handle object note", () => {
      const data = { note: { content: "test", id: 123 } };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });

    it("should handle function note", () => {
      const data = { note: () => "test" };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });

    it("should handle symbol note", () => {
      const data = { note: Symbol("test") };

      const result = validateJobData(data);

      expect(result).toBeNull();
    });
  });

  describe("Error Consistency", () => {
    it("should return consistent error for missing note", () => {
      const data1 = { userId: "user-123" };
      const data2 = { priority: "high" };
      const data3 = {};

      const result1 = validateJobData(data1);
      const result2 = validateJobData(data2);
      const result3 = validateJobData(data3);

      expect(result1?.message).toBe("Invalid job data: missing note");
      expect(result2?.message).toBe("Invalid job data: missing note");
      expect(result3?.message).toBe("Invalid job data: missing note");
      expect(result1?.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result2?.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result3?.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result1?.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result2?.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result3?.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should return consistent error for null/undefined data", () => {
      const result1 = validateJobData(
        null as unknown as Record<string, unknown>
      );
      const result2 = validateJobData(
        undefined as unknown as Record<string, unknown>
      );

      expect(result1?.message).toBe("Invalid job data: missing note");
      expect(result2?.message).toBe("Invalid job data: missing note");
      expect(result1?.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result2?.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result1?.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result2?.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe("Performance", () => {
    it("should handle rapid successive calls", () => {
      const data = { note: "test note" };
      const results = [];

      for (let i = 0; i < 100; i++) {
        results.push(validateJobData(data));
      }

      expect(results.every((result) => result === null)).toBe(true);
    });

    it("should handle rapid successive error calls", () => {
      const data = { userId: "user-123" };
      const results = [];

      for (let i = 0; i < 100; i++) {
        results.push(validateJobData(data));
      }

      expect(
        results.every(
          (result) => result?.message === "Invalid job data: missing note"
        )
      ).toBe(true);
    });
  });
});
