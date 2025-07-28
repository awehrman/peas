import { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  asyncHandler,
  createJsonHandler,
  createQueueHandler,
  createRateLimitMiddleware,
  createRouteHandler,
  createValidationMiddleware,
  validateRequestBody,
  validateRequiredParams,
} from "../route-handler";

// Mock dependencies
vi.mock("../error-handler", () => ({
  ErrorHandler: {
    handleRouteError: vi.fn(() => ({ error: "Test error" })),
    createHttpSuccessResponse: vi.fn((data) => ({ success: true, data })),
    createHttpErrorResponse: vi.fn((error) => ({ success: false, error })),
    createJobError: vi.fn((message, type, severity, context) => ({
      type,
      severity,
      message,
      context,
      timestamp: new Date(),
    })),
  },
}));

vi.mock("../utils", () => ({
  measureExecutionTime: vi.fn(async (fn) => {
    const result = await fn();
    return { result, duration: 100 };
  }),
}));

vi.mock("../config/constants", () => ({
  HTTP_CONSTANTS: {
    STATUS_CODES: {
      INTERNAL_SERVER_ERROR: 500,
      BAD_REQUEST: 400,
      TOO_MANY_REQUESTS: 429,
    },
  },
}));

describe("Route Handler Functions", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      params: {},
      query: {},
      body: {},
      ip: "127.0.0.1",
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe("createRouteHandler", () => {
    it("should create route handler that executes successfully", async () => {
      const handler = vi.fn(async () => "success");
      const routeHandler = createRouteHandler(handler, "test_operation");

      await routeHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalledWith(mockReq, mockRes);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it("should handle errors in route handler", async () => {
      const handler = vi.fn(async () => {
        throw new Error("Test error");
      });
      const routeHandler = createRouteHandler(handler, "test_operation");

      await routeHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Test error" });
    });
  });

  describe("asyncHandler", () => {
    it("should handle async operations successfully", async () => {
      const handler = vi.fn(async () => {
        // Async operation
      });
      const asyncRouteHandler = asyncHandler(handler);

      await asyncRouteHandler(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle errors in async handler", async () => {
      const error = new Error("Test error");
      const handler = vi.fn(async () => {
        throw error;
      });
      const asyncRouteHandler = asyncHandler(handler);

      await asyncRouteHandler(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("createJsonHandler", () => {
    it("should create JSON handler that returns success response", async () => {
      const handler = vi.fn(async () => ({ data: "test" }));
      const jsonHandler = createJsonHandler(handler, "test_operation");

      await jsonHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalledWith(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { data: "test" },
      });
    });

    it("should handle errors in JSON handler", async () => {
      const handler = vi.fn(async () => {
        throw new Error("Test error");
      });
      const jsonHandler = createJsonHandler(handler, "test_operation");

      await jsonHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Test error" });
    });
  });

  describe("createQueueHandler", () => {
    it("should create queue handler that returns success response", async () => {
      const handler = vi.fn(async () => ({ jobId: "123" }));
      const queueHandler = createQueueHandler(handler, "test_operation");

      await queueHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalledWith(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { jobId: "123" },
      });
    });

    it("should handle errors in queue handler", async () => {
      const handler = vi.fn(async () => {
        throw new Error("Test error");
      });
      const queueHandler = createQueueHandler(handler, "test_operation");

      await queueHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Test error" });
    });
  });

  describe("validateRequiredParams", () => {
    it("should pass validation when all required params are present", () => {
      mockReq.params = { id: "123" };
      mockReq.query = { type: "test" };
      mockReq.body = { name: "test" };

      expect(() => {
        validateRequiredParams(mockReq as Request, ["id", "type", "name"]);
      }).not.toThrow();
    });

    it("should throw error when required params are missing", () => {
      mockReq.params = { id: "123" };
      mockReq.query = {};
      mockReq.body = {};

      expect(() => {
        validateRequiredParams(mockReq as Request, ["id", "type", "name"]);
      }).toThrow("Missing required parameters: type, name");
    });

    it("should handle empty required params array", () => {
      expect(() => {
        validateRequiredParams(mockReq as Request, []);
      }).not.toThrow();
    });
  });

  describe("validateRequestBody", () => {
    it("should return body when validation passes", () => {
      const body = { name: "test", age: 25 };
      mockReq.body = body;

      const validator = (data: unknown): data is typeof body => {
        return typeof data === "object" && data !== null && "name" in data;
      };

      const result = validateRequestBody(mockReq as Request, validator);

      expect(result).toBe(body);
    });

    it("should throw error when validation fails", () => {
      mockReq.body = { age: 25 };

      const validator = (data: unknown): data is { name: string } => {
        return typeof data === "object" && data !== null && "name" in data;
      };

      expect(() => {
        validateRequestBody(mockReq as Request, validator);
      }).toThrow("Invalid request body");
    });
  });

  describe("createValidationMiddleware", () => {
    it("should create middleware that passes validation", () => {
      const middleware = createValidationMiddleware(
        ["id"],
        (body) => typeof body === "object" && body !== null
      );

      mockReq.params = { id: "123" };
      mockReq.body = { name: "test" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should handle missing required params", () => {
      const middleware = createValidationMiddleware(["id"]);

      mockReq.params = {};
      mockReq.body = { name: "test" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Test error" });
    });

    it("should handle invalid request body", () => {
      const middleware = createValidationMiddleware(
        [],
        (body) => typeof body === "object" && body !== null && "name" in body
      );

      mockReq.body = { age: 25 };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Test error" });
    });

    it("should handle validation without body validator", () => {
      const middleware = createValidationMiddleware(["id"]);

      mockReq.params = { id: "123" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should handle validation without required params", () => {
      const middleware = createValidationMiddleware(
        [],
        (body) => typeof body === "object" && body !== null
      );

      mockReq.body = { name: "test" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe("createRateLimitMiddleware", () => {
    it("should allow requests within rate limit", () => {
      const middleware = createRateLimitMiddleware(5, 60000); // 5 requests per minute

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should block requests exceeding rate limit", () => {
      const middleware = createRateLimitMiddleware(2, 60000); // 2 requests per minute

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Object),
      });
    });

    it("should reset rate limit after window expires", () => {
      vi.useFakeTimers();
      const middleware = createRateLimitMiddleware(1, 100); // 1 request per 100ms

      // First request
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Second request (should be blocked)
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(429);

      // Fast-forward time
      vi.advanceTimersByTime(150);

      // Third request (should be allowed after window expires)
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it("should handle requests without IP", () => {
      const reqWithoutIp = { ...mockReq, ip: undefined };
      const middleware = createRateLimitMiddleware(1, 60000);

      middleware(reqWithoutIp as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle multiple clients", () => {
      const middleware = createRateLimitMiddleware(1, 60000);

      // Client 1
      const client1Req = { ...mockReq, ip: "127.0.0.1" };
      middleware(client1Req as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Client 2
      const client2Req = { ...mockReq, ip: "192.168.1.1" };
      middleware(client2Req as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);

      // Client 1 again (should be blocked)
      const client1Req2 = { ...mockReq, ip: "127.0.0.1" };
      middleware(client1Req2 as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(429);
    });
  });
});
