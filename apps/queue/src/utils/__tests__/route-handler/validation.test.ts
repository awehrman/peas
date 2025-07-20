import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateRequiredParams,
  validateRequestBody,
} from "../../route-handler";
import type { Request } from "express";

describe("Validation Functions", () => {
  let mockReq: Partial<Request>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {},
    };
  });

  describe("validateRequiredParams", () => {
    it("should pass when all required params are present in body", () => {
      mockReq.body = { id: "123", name: "test" };

      expect(() =>
        validateRequiredParams(mockReq as Request, ["id", "name"])
      ).not.toThrow();
    });

    it("should pass when all required params are present in params", () => {
      mockReq.params = { id: "123", name: "test" };

      expect(() =>
        validateRequiredParams(mockReq as Request, ["id", "name"])
      ).not.toThrow();
    });

    it("should pass when all required params are present in query", () => {
      mockReq.query = { id: "123", name: "test" };

      expect(() =>
        validateRequiredParams(mockReq as Request, ["id", "name"])
      ).not.toThrow();
    });

    it("should pass when params are distributed across different sources", () => {
      mockReq.body = { id: "123" };
      mockReq.params = { name: "test" };
      mockReq.query = { type: "user" };

      expect(() =>
        validateRequiredParams(mockReq as Request, ["id", "name", "type"])
      ).not.toThrow();
    });

    it("should throw error when required param is missing", () => {
      mockReq.body = { id: "123" };

      expect(() =>
        validateRequiredParams(mockReq as Request, ["id", "name"])
      ).toThrow("Missing required parameters: name");
    });

    it("should throw error when multiple required params are missing", () => {
      mockReq.body = { id: "123" };

      expect(() =>
        validateRequiredParams(mockReq as Request, ["id", "name", "email"])
      ).toThrow("Missing required parameters: name, email");
    });

    it("should throw error when all required params are missing", () => {
      expect(() =>
        validateRequiredParams(mockReq as Request, ["id", "name"])
      ).toThrow("Missing required parameters: id, name");
    });

    it("should handle empty required params array", () => {
      expect(() =>
        validateRequiredParams(mockReq as Request, [])
      ).not.toThrow();
    });

    it("should handle falsy values as missing", () => {
      mockReq.body = { id: null, name: undefined, email: "" };

      expect(() =>
        validateRequiredParams(mockReq as Request, ["id", "name", "email"])
      ).toThrow("Missing required parameters: id, name, email");
    });
  });

  describe("validateRequestBody", () => {
    it("should return body when validator passes", () => {
      const body = { id: "123", name: "test" };
      mockReq.body = body;

      const validator = (data: unknown): data is typeof body => {
        return (
          typeof data === "object" &&
          data !== null &&
          "id" in data &&
          "name" in data
        );
      };

      const result = validateRequestBody(mockReq as Request, validator);
      expect(result).toEqual(body);
    });

    it("should throw error when validator fails", () => {
      const body = { id: "123" };
      mockReq.body = body;

      const validator = (
        data: unknown
      ): data is { id: string; name: string } => {
        return (
          typeof data === "object" &&
          data !== null &&
          "id" in data &&
          "name" in data
        );
      };

      expect(() => validateRequestBody(mockReq as Request, validator)).toThrow(
        "Invalid request body"
      );
    });

    it("should throw error when body is null", () => {
      mockReq.body = null;

      const validator = (data: unknown): data is { id: string } => {
        return typeof data === "object" && data !== null && "id" in data;
      };

      expect(() => validateRequestBody(mockReq as Request, validator)).toThrow(
        "Invalid request body"
      );
    });

    it("should throw error when body is undefined", () => {
      mockReq.body = undefined;

      const validator = (data: unknown): data is { id: string } => {
        return typeof data === "object" && data !== null && "id" in data;
      };

      expect(() => validateRequestBody(mockReq as Request, validator)).toThrow(
        "Invalid request body"
      );
    });

    it("should work with complex type guards", () => {
      const body = {
        id: "123",
        name: "test",
        metadata: {
          created: "2024-01-01",
          tags: ["tag1", "tag2"],
        },
      };
      mockReq.body = body;

      const validator = (data: unknown): data is typeof body => {
        if (typeof data !== "object" || data === null) return false;
        const obj = data as Record<string, unknown>;
        return (
          typeof obj.id === "string" &&
          typeof obj.name === "string" &&
          typeof obj.metadata === "object" &&
          obj.metadata !== null
        );
      };

      const result = validateRequestBody(mockReq as Request, validator);
      expect(result).toEqual(body);
    });

    it("should work with primitive type validation", () => {
      mockReq.body = "test string";

      const validator = (data: unknown): data is string => {
        return typeof data === "string";
      };

      const result = validateRequestBody(mockReq as Request, validator);
      expect(result).toBe("test string");
    });

    it("should work with array validation", () => {
      const body = [1, 2, 3];
      mockReq.body = body;

      const validator = (data: unknown): data is number[] => {
        return (
          Array.isArray(data) && data.every((item) => typeof item === "number")
        );
      };

      const result = validateRequestBody(mockReq as Request, validator);
      expect(result).toEqual(body);
    });
  });
});
