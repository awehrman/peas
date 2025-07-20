import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from "vitest";
import {
  createValidationMiddleware,
  createRateLimitMiddleware,
} from "../../route-handler";
import type { Request, Response, NextFunction } from "express";
import { ErrorType, ErrorSeverity } from "../../../types";

// Mock dependencies
vi.mock("../../error-handler", () => ({
  ErrorHandler: {
    handleRouteError: vi.fn(),
    createHttpErrorResponse: vi.fn(),
    createJobError: vi.fn(),
  },
}));

vi.mock("../../config/constants", () => ({
  HTTP_CONSTANTS: {
    STATUS_CODES: {
      BAD_REQUEST: 400,
      TOO_MANY_REQUESTS: 429,
    },
  },
}));

describe("Middleware Functions", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {},
      ip: "127.0.0.1",
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockNext = vi.fn();
  });

  describe("createValidationMiddleware", () => {
    it("should call next when no validation is required", () => {
      const middleware = createValidationMiddleware();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should validate required params and call next when valid", () => {
      mockReq.body = { id: "123" };
      mockReq.params = { name: "test" };

      const middleware = createValidationMiddleware(["id", "name"]);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should validate body and call next when valid", () => {
      mockReq.body = { id: "123", name: "test" };

      const bodyValidator = (
        body: unknown
      ): body is { id: string; name: string } => {
        return (
          typeof body === "object" &&
          body !== null &&
          "id" in body &&
          "name" in body
        );
      };

      const middleware = createValidationMiddleware([], bodyValidator);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should validate both params and body when both are provided", () => {
      mockReq.body = { id: "123", name: "test" };
      mockReq.params = { type: "user" };

      const bodyValidator = (
        body: unknown
      ): body is { id: string; name: string } => {
        return (
          typeof body === "object" &&
          body !== null &&
          "id" in body &&
          "name" in body
        );
      };

      const middleware = createValidationMiddleware(["type"], bodyValidator);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should return error response when required params are missing", async () => {
      const { ErrorHandler } = await import("../../error-handler");
      const mockErrorResponse = {
        success: false,
        error: {
          message: "Missing required parameters: id, name",
          type: ErrorType.VALIDATION_ERROR,
          code: undefined,
        },
        context: {},
        timestamp: "2024-01-01T00:00:00.000Z",
      };
      vi.mocked(ErrorHandler.handleRouteError).mockReturnValue(
        mockErrorResponse
      );

      const middleware = createValidationMiddleware(["id", "name"]);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(ErrorHandler.handleRouteError).toHaveBeenCalledWith(
        expect.any(Error),
        "request_validation"
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(mockErrorResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return error response when body validation fails", async () => {
      const { ErrorHandler } = await import("../../error-handler");
      const mockErrorResponse = {
        success: false,
        error: {
          message: "Invalid request body",
          type: ErrorType.VALIDATION_ERROR,
          code: undefined,
        },
        context: {},
        timestamp: "2024-01-01T00:00:00.000Z",
      };
      vi.mocked(ErrorHandler.handleRouteError).mockReturnValue(
        mockErrorResponse
      );

      mockReq.body = { id: "123" }; // Missing name

      const bodyValidator = (
        body: unknown
      ): body is { id: string; name: string } => {
        return (
          typeof body === "object" &&
          body !== null &&
          "id" in body &&
          "name" in body
        );
      };

      const middleware = createValidationMiddleware([], bodyValidator);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(ErrorHandler.handleRouteError).toHaveBeenCalledWith(
        expect.any(Error),
        "request_validation"
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(mockErrorResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle body validation when body is null", async () => {
      const { ErrorHandler } = await import("../../error-handler");

      mockReq.body = null;

      const bodyValidator = (body: unknown): body is { id: string } => {
        return typeof body === "object" && body !== null && "id" in body;
      };

      const middleware = createValidationMiddleware([], bodyValidator);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // When body is null, the middleware doesn't call the validator
      // because of the condition: if (bodyValidator && req.body)
      expect(ErrorHandler.handleRouteError).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("createRateLimitMiddleware", () => {
    it("should allow first request", () => {
      const middleware = createRateLimitMiddleware(5, 60000);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should allow requests within limit", () => {
      const middleware = createRateLimitMiddleware(3, 60000);

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should block requests when limit is exceeded", async () => {
      const { ErrorHandler } = await import("../../error-handler");
      const mockErrorResponse = {
        success: false,
        error: {
          message: "Rate limit exceeded",
          type: ErrorType.EXTERNAL_SERVICE_ERROR,
          code: undefined,
        },
        context: {},
        timestamp: "2024-01-01T00:00:00.000Z",
      };
      vi.mocked(ErrorHandler.createHttpErrorResponse).mockReturnValue(
        mockErrorResponse
      );
      vi.mocked(ErrorHandler.createJobError).mockReturnValue({
        message: "Rate limit exceeded",
        type: ErrorType.EXTERNAL_SERVICE_ERROR,
        severity: ErrorSeverity.MEDIUM,
        context: { clientId: "127.0.0.1", maxRequests: 2, windowMs: 60000 },
        timestamp: new Date(),
      });

      const middleware = createRateLimitMiddleware(2, 60000);

      // Make 3 requests (exceeding limit of 2)
      for (let i = 0; i < 3; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(mockErrorResponse);
    });

    it("should reset counter after window expires", () => {
      const middleware = createRateLimitMiddleware(2, 100); // 100ms window

      // Make 2 requests
      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(2);

      // Wait for window to expire
      vi.advanceTimersByTime(150);

      // Should allow another request after window expires
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should handle unknown IP address", () => {
      const reqWithoutIp = {
        ...mockReq,
        ip: undefined,
      };

      const middleware = createRateLimitMiddleware(1, 60000);

      middleware(reqWithoutIp as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should track different clients separately", () => {
      const middleware = createRateLimitMiddleware(2, 60000);

      // Client 1 makes 2 requests
      const client1Req = {
        ...mockReq,
        ip: "127.0.0.1",
      };
      middleware(client1Req as Request, mockRes as Response, mockNext);
      middleware(client1Req as Request, mockRes as Response, mockNext);

      // Client 2 makes 2 requests
      const client2Req = {
        ...mockReq,
        ip: "192.168.1.1",
      };
      middleware(client2Req as Request, mockRes as Response, mockNext);
      middleware(client2Req as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(4);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should handle zero max requests", async () => {
      const { ErrorHandler } = await import("../../error-handler");
      const mockErrorResponse = {
        success: false,
        error: {
          message: "Rate limit exceeded",
          type: ErrorType.EXTERNAL_SERVICE_ERROR,
          code: undefined,
        },
        context: {},
        timestamp: "2024-01-01T00:00:00.000Z",
      };
      vi.mocked(ErrorHandler.createHttpErrorResponse).mockReturnValue(
        mockErrorResponse
      );
      vi.mocked(ErrorHandler.createJobError).mockReturnValue({
        message: "Rate limit exceeded",
        type: ErrorType.EXTERNAL_SERVICE_ERROR,
        severity: ErrorSeverity.MEDIUM,
        context: { clientId: "127.0.0.1", maxRequests: 0, windowMs: 60000 },
        timestamp: new Date(),
      });

      const middleware = createRateLimitMiddleware(0, 60000);

      // First request should pass (creates new record with count 1)
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();

      // Second request should be blocked (1 >= 0)
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1); // Still only called once
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(mockErrorResponse);
    });
  });
});
