import { describe, it, expect } from "vitest";
import { ErrorHandler } from "../../error-handler";
import { ErrorType, ErrorSeverity } from "../../../types";

describe("ErrorHandler.createDatabaseError", () => {
  describe("Basic Database Error Creation", () => {
    it("should create a DatabaseError with required error parameter", () => {
      const originalError = new Error("Database connection failed");
      const dbErr = ErrorHandler.createDatabaseError(originalError);

      expect(dbErr.message).toBe("Database connection failed");
      expect(dbErr.type).toBe(ErrorType.DATABASE_ERROR);
      expect(dbErr.severity).toBe(ErrorSeverity.HIGH);
      expect(dbErr.operation).toBeUndefined();
      expect(dbErr.table).toBeUndefined();
      expect(dbErr.context).toBeUndefined();
      expect(dbErr.timestamp).toBeInstanceOf(Date);
      expect(dbErr.originalError).toBe(originalError);
    });

    it("should create a DatabaseError with operation and table", () => {
      const originalError = new Error("Insert failed");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "insert",
        "users"
      );

      expect(dbErr.message).toBe("Insert failed");
      expect(dbErr.type).toBe(ErrorType.DATABASE_ERROR);
      expect(dbErr.severity).toBe(ErrorSeverity.HIGH);
      expect(dbErr.operation).toBe("insert");
      expect(dbErr.table).toBe("users");
      expect(dbErr.context).toBeUndefined();
      expect(dbErr.originalError).toBe(originalError);
    });

    it("should create a DatabaseError with context", () => {
      const originalError = new Error("Query timeout");
      const context = { query: "SELECT * FROM users", timeout: 5000 };
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "select",
        "users",
        context
      );

      expect(dbErr.message).toBe("Query timeout");
      expect(dbErr.type).toBe(ErrorType.DATABASE_ERROR);
      expect(dbErr.severity).toBe(ErrorSeverity.HIGH);
      expect(dbErr.operation).toBe("select");
      expect(dbErr.table).toBe("users");
      expect(dbErr.context).toEqual(context);
      expect(dbErr.originalError).toBe(originalError);
    });
  });

  describe("Operation Parameter", () => {
    it("should handle undefined operation", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(originalError, undefined);
      expect(dbErr.operation).toBeUndefined();
    });

    it("should handle null operation", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        null as unknown as string
      );
      expect(dbErr.operation).toBeNull();
    });

    it("should handle empty string operation", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(originalError, "");
      expect(dbErr.operation).toBe("");
    });

    it("should handle operation with special characters", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "insert-batch"
      );
      expect(dbErr.operation).toBe("insert-batch");
    });

    it("should handle operation with spaces", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "bulk insert"
      );
      expect(dbErr.operation).toBe("bulk insert");
    });

    it("should handle operation with unicode characters", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(originalError, "插入操作");
      expect(dbErr.operation).toBe("插入操作");
    });

    it("should handle very long operation name", () => {
      const originalError = new Error("Database error");
      const longOperation = "a".repeat(1000);
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        longOperation
      );
      expect(dbErr.operation).toBe(longOperation);
    });
  });

  describe("Table Parameter", () => {
    it("should handle undefined table", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "select",
        undefined
      );
      expect(dbErr.table).toBeUndefined();
    });

    it("should handle null table", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "select",
        null as unknown as string
      );
      expect(dbErr.table).toBeNull();
    });

    it("should handle empty string table", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "select",
        ""
      );
      expect(dbErr.table).toBe("");
    });

    it("should handle table with special characters", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "select",
        "user_profiles"
      );
      expect(dbErr.table).toBe("user_profiles");
    });

    it("should handle table with spaces", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "select",
        "user profiles"
      );
      expect(dbErr.table).toBe("user profiles");
    });

    it("should handle table with unicode characters", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "select",
        "用户表"
      );
      expect(dbErr.table).toBe("用户表");
    });

    it("should handle very long table name", () => {
      const originalError = new Error("Database error");
      const longTable = "a".repeat(1000);
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "select",
        longTable
      );
      expect(dbErr.table).toBe(longTable);
    });
  });

  describe("Context Parameter", () => {
    it("should handle undefined context", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "select",
        "users",
        undefined
      );
      expect(dbErr.context).toBeUndefined();
    });

    it("should handle null context", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "select",
        "users",
        null as unknown as Record<string, unknown>
      );
      expect(dbErr.context).toBeNull();
    });

    it("should handle empty context object", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "select",
        "users",
        {}
      );
      expect(dbErr.context).toEqual({});
    });

    it("should handle complex context object", () => {
      const originalError = new Error("Database error");
      const context = {
        query: "SELECT * FROM users WHERE id = ?",
        params: [123],
        metadata: {
          source: "api",
          version: "1.0.0",
        },
        performance: {
          executionTime: 1500,
          rowsAffected: 0,
        },
        array: [1, 2, 3],
        boolean: true,
        nullValue: null,
        undefinedValue: undefined,
      };
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "select",
        "users",
        context
      );
      expect(dbErr.context).toEqual(context);
    });

    it("should handle context with nested objects", () => {
      const originalError = new Error("Database error");
      const context = {
        request: {
          method: "POST",
          url: "/api/users",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer token",
          },
        },
        database: {
          connection: "pool-1",
          transaction: "tx-123",
          isolation: "READ_COMMITTED",
        },
      };
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "insert",
        "users",
        context
      );
      expect(dbErr.context).toEqual(context);
    });
  });

  describe("Error Object Handling", () => {
    it("should handle Error with stack trace", () => {
      const originalError = new Error("Database error");
      originalError.stack = "Error: Database error\n    at db.js:1:1";
      const dbErr = ErrorHandler.createDatabaseError(originalError);

      expect(dbErr.originalError).toBe(originalError);
      expect(dbErr.originalError?.stack).toBe(
        "Error: Database error\n    at db.js:1:1"
      );
    });

    it("should handle Error with custom name", () => {
      const originalError = new Error("Database error");
      originalError.name = "DatabaseError";
      const dbErr = ErrorHandler.createDatabaseError(originalError);

      expect(dbErr.originalError).toBe(originalError);
      expect(dbErr.originalError?.name).toBe("DatabaseError");
    });

    it("should handle Error with empty message", () => {
      const originalError = new Error("");
      const dbErr = ErrorHandler.createDatabaseError(originalError);

      expect(dbErr.message).toBe("");
      expect(dbErr.originalError).toBe(originalError);
    });

    it("should handle Error with special characters in message", () => {
      const originalError = new Error(
        "Database error with special chars: !@#$%^&*()"
      );
      const dbErr = ErrorHandler.createDatabaseError(originalError);

      expect(dbErr.message).toBe(
        "Database error with special chars: !@#$%^&*()"
      );
      expect(dbErr.originalError).toBe(originalError);
    });

    it("should handle Error with unicode characters in message", () => {
      const originalError = new Error(
        "Database error with unicode: 🍕🍔🌮 中文 Español Français"
      );
      const dbErr = ErrorHandler.createDatabaseError(originalError);

      expect(dbErr.message).toBe(
        "Database error with unicode: 🍕🍔🌮 中文 Español Français"
      );
      expect(dbErr.originalError).toBe(originalError);
    });

    it("should handle Error with very long message", () => {
      const longMessage = "A".repeat(10000);
      const originalError = new Error(longMessage);
      const dbErr = ErrorHandler.createDatabaseError(originalError);

      expect(dbErr.message).toBe(longMessage);
      expect(dbErr.originalError).toBe(originalError);
    });
  });

  describe("Type Safety", () => {
    it("should return DatabaseError type", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(originalError);
      expect(dbErr).toMatchObject({
        type: ErrorType.DATABASE_ERROR,
        severity: ErrorSeverity.HIGH,
      });
    });

    it("should have correct DatabaseError structure", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "select",
        "users"
      );

      // Check that it has all required JobError properties
      expect(dbErr).toHaveProperty("type");
      expect(dbErr).toHaveProperty("severity");
      expect(dbErr).toHaveProperty("message");
      expect(dbErr).toHaveProperty("timestamp");
      expect(dbErr).toHaveProperty("originalError");

      // Check that it has DatabaseError specific properties
      expect(dbErr).toHaveProperty("operation");
      expect(dbErr).toHaveProperty("table");
    });
  });

  describe("Timestamp Handling", () => {
    it("should create timestamp when called", () => {
      const before = new Date();
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(originalError);
      const after = new Date();

      expect(dbErr.timestamp).toBeInstanceOf(Date);
      expect(dbErr.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(dbErr.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should create unique timestamps for different calls", async () => {
      const originalError1 = new Error("Database error 1");
      const originalError2 = new Error("Database error 2");
      const dbErr1 = ErrorHandler.createDatabaseError(originalError1);
      await new Promise((r) => setTimeout(r, 2));
      const dbErr2 = ErrorHandler.createDatabaseError(originalError2);

      expect(dbErr1.timestamp).not.toEqual(dbErr2.timestamp);
    });
  });

  describe("Edge Cases", () => {
    it("should handle all parameters as undefined", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        undefined,
        undefined,
        undefined
      );
      expect(dbErr.operation).toBeUndefined();
      expect(dbErr.table).toBeUndefined();
      expect(dbErr.context).toBeUndefined();
    });

    it("should handle all parameters as null", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        null as unknown as string,
        null as unknown as string,
        null as unknown as Record<string, unknown>
      );
      expect(dbErr.operation).toBeNull();
      expect(dbErr.table).toBeNull();
      expect(dbErr.context).toBeNull();
    });

    it("should handle operation with null table", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        "select",
        null as unknown as string
      );
      expect(dbErr.operation).toBe("select");
      expect(dbErr.table).toBeNull();
    });

    it("should handle table with null operation", () => {
      const originalError = new Error("Database error");
      const dbErr = ErrorHandler.createDatabaseError(
        originalError,
        null as unknown as string,
        "users"
      );
      expect(dbErr.operation).toBeNull();
      expect(dbErr.table).toBe("users");
    });
  });
});
