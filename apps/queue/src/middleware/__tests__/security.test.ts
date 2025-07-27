import type { NextFunction, Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SECURITY_CONSTANTS } from "../../config/constants";
import {
  createMockNext,
  createMockRequest,
  createMockResponse,
} from "../../test-utils/helpers";
import { HttpStatus } from "../../types";
import {
  SecurityMiddleware,
  addSecurityHeaders,
  configureCORS,
  createRateLimitMiddleware,
  validateContent,
  validatePagination,
  validateRequestSize,
  validateUUID,
} from "../security";

// Type for request with validated query
interface RequestWithValidatedQuery extends Request {
  validatedQuery?: {
    page: number;
    limit: number;
  };
}

describe("security.ts", () => {
  let req: RequestWithValidatedQuery;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Rate Limiting", () => {
    describe("createRateLimitMiddleware", () => {
      it("should create rate limit middleware with default values", () => {
        const middleware = createRateLimitMiddleware();
        expect(typeof middleware).toBe("function");
      });

      it("should create rate limit middleware with custom values", () => {
        const middleware = createRateLimitMiddleware(60000, 50);
        expect(typeof middleware).toBe("function");
      });

      it("should allow first request and set headers", () => {
        const middleware = createRateLimitMiddleware(60000, 100);
        middleware(req, res, next);

        expect(res.set).toHaveBeenCalledWith({
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "99",
          "X-RateLimit-Reset": expect.any(String),
        });
        expect(next).toHaveBeenCalled();
      });

      it("should increment count for subsequent requests", () => {
        const middleware = createRateLimitMiddleware(60000, 100);
        req = createMockRequest({ ip: "192.168.1.100" });

        // First request
        middleware(req, res, next);
        expect(res.set).toHaveBeenCalledWith({
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "99",
          "X-RateLimit-Reset": expect.any(String),
        });

        // Clear the mock to check second call separately
        vi.clearAllMocks();

        // Second request
        middleware(req, res, next);
        expect(res.set).toHaveBeenCalledWith({
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "98",
          "X-RateLimit-Reset": expect.any(String),
        });
        expect(next).toHaveBeenCalledTimes(1);
      });

      it("should block requests when limit exceeded", () => {
        const middleware = createRateLimitMiddleware(60000, 1);
        req = createMockRequest({ ip: "192.168.1.101" });

        // First request (allowed)
        middleware(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);

        // Clear mocks to check second call separately
        vi.clearAllMocks();

        // Second request (blocked)
        middleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
        expect(res.json).toHaveBeenCalledWith({
          error: "Too many requests",
          message: expect.stringContaining("Rate limit exceeded"),
          retryAfter: expect.any(Number),
        });
        expect(next).not.toHaveBeenCalled();
      });

      it("should reset rate limit after window expires", () => {
        const middleware = createRateLimitMiddleware(1000, 1);
        req = createMockRequest({ ip: "192.168.1.102" });

        // First request
        middleware(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);

        // Second request (blocked)
        middleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);

        // Clear mocks and advance time past window
        vi.clearAllMocks();
        vi.advanceTimersByTime(1100);

        // Third request (allowed again)
        middleware(req, res, next);
        expect(res.set).toHaveBeenCalledWith({
          "X-RateLimit-Limit": "1",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": expect.any(String),
        });
        expect(next).toHaveBeenCalledTimes(1);
      });

      it("should handle unknown IP address", () => {
        req = createMockRequest({ ip: undefined });
        const middleware = createRateLimitMiddleware();
        middleware(req, res, next);

        expect(res.set).toHaveBeenCalledWith({
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "99",
          "X-RateLimit-Reset": expect.any(String),
        });
        expect(next).toHaveBeenCalled();
      });

      it("should handle different IP addresses separately", () => {
        const middleware = createRateLimitMiddleware(60000, 1);

        // Request from IP 1
        req = createMockRequest({ ip: "192.168.1.1" });
        middleware(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);

        // Request from IP 2 (should be allowed)
        req = createMockRequest({ ip: "192.168.1.2" });
        middleware(req, res, next);
        expect(next).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Input Validation", () => {
    describe("validateUUID", () => {
      it("should pass when no ID parameter is present", () => {
        validateUUID(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it("should pass with valid UUID", () => {
        req.params.id = "123e4567-e89b-12d3-a456-426614174000";
        validateUUID(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it("should pass with valid UUID in different case", () => {
        req.params.id = "123E4567-E89B-12D3-A456-426614174000";
        validateUUID(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it("should reject invalid UUID format", () => {
        req.params.id = "invalid-uuid";
        validateUUID(req, res, next);
        expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith({
          error: "Invalid ID format",
          message: "ID must be a valid UUID",
        });
        expect(next).not.toHaveBeenCalled();
      });

      it("should reject UUID with wrong length", () => {
        req.params.id = "123e4567-e89b-12d3-a456-42661417400"; // Missing one character
        validateUUID(req, res, next);
        expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith({
          error: "Invalid ID format",
          message: "ID must be a valid UUID",
        });
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe("validatePagination", () => {
      it("should use default values when no query parameters", () => {
        validatePagination(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.validatedQuery).toEqual({ page: 1, limit: 20 });
      });

      it("should parse valid page and limit parameters", () => {
        req.query = { page: "5", limit: "25" };
        validatePagination(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.validatedQuery).toEqual({ page: 5, limit: 25 });
      });

      it("should handle string parameters that can be parsed as integers", () => {
        req.query = { page: "10", limit: "50" };
        validatePagination(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.validatedQuery).toEqual({ page: 10, limit: 50 });
      });

      it("should reject page number less than 1", () => {
        const testRes = createMockResponse();
        const testNext = createMockNext();
        req.query = { page: "0", limit: "20" };
        validatePagination(req, testRes, testNext);
        expect(testRes.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(testRes.json).toHaveBeenCalledWith({
          error: "Invalid page number",
          message: "Page must be greater than 0",
        });
        expect(testNext).not.toHaveBeenCalled();
      });

      it("should reject negative page number", () => {
        req.query = { page: "-1" };
        validatePagination(req, res, next);
        expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith({
          error: "Invalid page number",
          message: "Page must be greater than 0",
        });
        expect(next).not.toHaveBeenCalled();
      });

      it("should reject limit less than 1", () => {
        const testRes = createMockResponse();
        const testNext = createMockNext();
        req.query = { page: "1", limit: "0" };
        validatePagination(req, testRes, testNext);
        expect(testRes.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(testRes.json).toHaveBeenCalledWith({
          error: "Invalid limit",
          message: "Limit must be between 1 and 100",
        });
        expect(testNext).not.toHaveBeenCalled();
      });

      it("should reject limit greater than 100", () => {
        req.query = { limit: "101" };
        validatePagination(req, res, next);
        expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith({
          error: "Invalid limit",
          message: "Limit must be between 1 and 100",
        });
        expect(next).not.toHaveBeenCalled();
      });

      it("should handle both page and limit validation errors", () => {
        const testRes = createMockResponse();
        const testNext = createMockNext();
        req.query = { page: "0", limit: "101" };
        validatePagination(req, testRes, testNext);
        expect(testRes.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(testRes.json).toHaveBeenCalledWith({
          error: "Invalid page number",
          message: "Page must be greater than 0",
        });
        expect(testNext).not.toHaveBeenCalled();
      });

      it("should handle non-numeric string parameters", () => {
        req.query = { page: "abc", limit: "def" };
        validatePagination(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.validatedQuery).toEqual({ page: 1, limit: 20 }); // Uses defaults
      });

      it("should update existing validatedQuery if present", () => {
        req.validatedQuery = { page: 1, limit: 10 };
        req.query = { page: "5", limit: "25" };
        validatePagination(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.validatedQuery).toEqual({ page: 5, limit: 25 });
      });
    });

    describe("validateContent", () => {
      it("should pass with valid content", () => {
        req.body = { content: "Valid content string" };
        validateContent(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it("should reject when content is missing", () => {
        req.body = {};
        validateContent(req, res, next);
        expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith({
          error: "Invalid content",
          message: "Content is required and must be a string",
        });
        expect(next).not.toHaveBeenCalled();
      });

      it("should reject when content is null", () => {
        req.body = { content: null };
        validateContent(req, res, next);
        expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith({
          error: "Invalid content",
          message: "Content is required and must be a string",
        });
        expect(next).not.toHaveBeenCalled();
      });

      it("should reject when content is undefined", () => {
        req.body = { content: undefined };
        validateContent(req, res, next);
        expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith({
          error: "Invalid content",
          message: "Content is required and must be a string",
        });
        expect(next).not.toHaveBeenCalled();
      });

      it("should reject when content is not a string", () => {
        req.body = { content: 123 };
        validateContent(req, res, next);
        expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith({
          error: "Invalid content",
          message: "Content is required and must be a string",
        });
        expect(next).not.toHaveBeenCalled();
      });

      it("should reject when content is an empty string", () => {
        req.body = { content: "" };
        validateContent(req, res, next);
        expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith({
          error: "Invalid content",
          message: "Content is required and must be a string",
        });
        expect(next).not.toHaveBeenCalled();
      });

      it("should reject when content is too large", () => {
        const largeContent = "a".repeat(10 * 1024 * 1024 + 1); // 10MB + 1 byte
        req.body = { content: largeContent };
        validateContent(req, res, next);
        expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith({
          error: "Content too large",
          message: "Content size exceeds 10MB limit",
        });
        expect(next).not.toHaveBeenCalled();
      });

      it("should accept content exactly at the size limit", () => {
        const maxContent = "a".repeat(10 * 1024 * 1024); // Exactly 10MB
        req.body = { content: maxContent };
        validateContent(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it("should handle when body is undefined", () => {
        req.body = undefined;
        validateContent(req, res, next);
        expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith({
          error: "Invalid content",
          message: "Content is required and must be a string",
        });
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  describe("Security Headers", () => {
    describe("addSecurityHeaders", () => {
      it("should add all required security headers", () => {
        addSecurityHeaders(req, res, next);
        expect(res.set).toHaveBeenCalledWith({
          "X-Content-Type-Options":
            SECURITY_CONSTANTS.SECURITY_HEADERS.CONTENT_TYPE_OPTIONS,
          "X-Frame-Options": SECURITY_CONSTANTS.SECURITY_HEADERS.FRAME_OPTIONS,
          "X-XSS-Protection":
            SECURITY_CONSTANTS.SECURITY_HEADERS.XSS_PROTECTION,
          "Referrer-Policy":
            SECURITY_CONSTANTS.SECURITY_HEADERS.REFERRER_POLICY,
          "Content-Security-Policy":
            SECURITY_CONSTANTS.SECURITY_HEADERS.CONTENT_SECURITY_POLICY,
        });
        expect(next).toHaveBeenCalled();
      });
    });
  });

  describe("CORS Configuration", () => {
    describe("configureCORS", () => {
      it("should create CORS middleware with default origins", () => {
        const middleware = configureCORS();
        expect(typeof middleware).toBe("function");
      });

      it("should create CORS middleware with custom origins", () => {
        const middleware = configureCORS(["https://example.com"]);
        expect(typeof middleware).toBe("function");
      });

      it("should set CORS headers for allowed origin", () => {
        const middleware = configureCORS(["https://example.com"]);
        req.headers.origin = "https://example.com";
        middleware(req, res, next);

        expect(res.set).toHaveBeenCalledWith(
          "Access-Control-Allow-Origin",
          "https://example.com"
        );
        expect(res.set).toHaveBeenCalledWith({
          "Access-Control-Allow-Methods":
            SECURITY_CONSTANTS.CORS.ALLOWED_METHODS.join(", "),
          "Access-Control-Allow-Headers":
            SECURITY_CONSTANTS.CORS.ALLOWED_HEADERS.join(", "),
          "Access-Control-Allow-Credentials": "true",
        });
        expect(next).toHaveBeenCalled();
      });

      it("should not set Access-Control-Allow-Origin for disallowed origin", () => {
        const middleware = configureCORS(["https://example.com"]);
        req.headers.origin = "https://malicious.com";
        middleware(req, res, next);

        expect(res.set).not.toHaveBeenCalledWith(
          "Access-Control-Allow-Origin",
          "https://malicious.com"
        );
        expect(res.set).toHaveBeenCalledWith({
          "Access-Control-Allow-Methods":
            SECURITY_CONSTANTS.CORS.ALLOWED_METHODS.join(", "),
          "Access-Control-Allow-Headers":
            SECURITY_CONSTANTS.CORS.ALLOWED_HEADERS.join(", "),
          "Access-Control-Allow-Credentials": "true",
        });
        expect(next).toHaveBeenCalled();
      });

      it("should handle request without origin header", () => {
        const middleware = configureCORS(["https://example.com"]);
        delete req.headers.origin;
        middleware(req, res, next);

        expect(res.set).toHaveBeenCalledWith({
          "Access-Control-Allow-Methods":
            SECURITY_CONSTANTS.CORS.ALLOWED_METHODS.join(", "),
          "Access-Control-Allow-Headers":
            SECURITY_CONSTANTS.CORS.ALLOWED_HEADERS.join(", "),
          "Access-Control-Allow-Credentials": "true",
        });
        expect(next).toHaveBeenCalled();
      });

      it("should handle OPTIONS request", () => {
        const middleware = configureCORS(["https://example.com"]);
        req.method = "OPTIONS";
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
        expect(res.end).toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
      });

      it("should handle multiple allowed origins", () => {
        const middleware = configureCORS([
          "https://example.com",
          "https://test.com",
        ]);
        req.headers.origin = "https://test.com";
        middleware(req, res, next);

        expect(res.set).toHaveBeenCalledWith(
          "Access-Control-Allow-Origin",
          "https://test.com"
        );
        expect(next).toHaveBeenCalled();
      });
    });
  });

  describe("Request Size Limits", () => {
    describe("validateRequestSize", () => {
      it("should create request size middleware with default limit", () => {
        const middleware = validateRequestSize();
        expect(typeof middleware).toBe("function");
      });

      it("should create request size middleware with custom limit", () => {
        const middleware = validateRequestSize(5 * 1024 * 1024); // 5MB
        expect(typeof middleware).toBe("function");
      });

      it("should allow request within size limit", () => {
        const middleware = validateRequestSize(10 * 1024 * 1024); // 10MB
        req.headers["content-length"] = "5";
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it("should allow request exactly at size limit", () => {
        const middleware = validateRequestSize(10 * 1024 * 1024); // 10MB
        req.headers["content-length"] = "10485760"; // Exactly 10MB
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it("should reject request exceeding size limit", () => {
        const middleware = validateRequestSize(10 * 1024 * 1024); // 10MB
        req.headers["content-length"] = "10485761"; // 10MB + 1 byte
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
        expect(res.json).toHaveBeenCalledWith({
          error: "Request too large",
          message: "Request size exceeds 10MB limit",
        });
        expect(next).not.toHaveBeenCalled();
      });

      it("should handle request without content-length header", () => {
        const middleware = validateRequestSize(10 * 1024 * 1024);
        delete req.headers["content-length"];
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it("should handle non-numeric content-length", () => {
        const middleware = validateRequestSize(10 * 1024 * 1024);
        req.headers["content-length"] = "invalid";
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it("should handle custom size limit in error message", () => {
        const middleware = validateRequestSize(5 * 1024 * 1024); // 5MB
        req.headers["content-length"] = "5242881"; // 5MB + 1 byte
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
        expect(res.json).toHaveBeenCalledWith({
          error: "Request too large",
          message: "Request size exceeds 5MB limit",
        });
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  describe("SecurityMiddleware Export", () => {
    it("should export all middleware functions", () => {
      expect(SecurityMiddleware.rateLimit).toBe(createRateLimitMiddleware);
      expect(SecurityMiddleware.validateUUID).toBe(validateUUID);
      expect(SecurityMiddleware.validatePagination).toBe(validatePagination);
      expect(SecurityMiddleware.validateContent).toBe(validateContent);
      expect(SecurityMiddleware.addSecurityHeaders).toBe(addSecurityHeaders);
      expect(SecurityMiddleware.configureCORS).toBe(configureCORS);
      expect(SecurityMiddleware.validateRequestSize).toBe(validateRequestSize);
    });

    it("should export all middleware functions correctly", () => {
      expect(typeof SecurityMiddleware.rateLimit).toBe("function");
      expect(typeof SecurityMiddleware.validateUUID).toBe("function");
      expect(typeof SecurityMiddleware.validatePagination).toBe("function");
      expect(typeof SecurityMiddleware.validateContent).toBe("function");
      expect(typeof SecurityMiddleware.addSecurityHeaders).toBe("function");
      expect(typeof SecurityMiddleware.configureCORS).toBe("function");
      expect(typeof SecurityMiddleware.validateRequestSize).toBe("function");
    });
  });
});
