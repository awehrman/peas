import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRouteHandler } from "../../route-handler";
import type { Request, Response, NextFunction } from "express";
import { ErrorType } from "../../../types";

// Mock dependencies
vi.mock("../../error-handler", () => ({
  ErrorHandler: {
    handleRouteError: vi.fn(),
  },
}));

vi.mock("../../utils", () => ({
  measureExecutionTime: vi.fn(),
}));

vi.mock("../../config/constants", () => ({
  HTTP_CONSTANTS: {
    STATUS_CODES: {
      INTERNAL_SERVER_ERROR: 500,
    },
  },
}));

describe("createRouteHandler", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockNext = vi.fn();
  });

  it("should execute handler successfully and return result", async () => {
    const { measureExecutionTime } = await import("../../utils");
    const mockResult = { success: true, data: "test" };

    vi.mocked(measureExecutionTime).mockImplementation(async (fn) => {
      const result = await fn();
      return { result, duration: 100 };
    });

    const handler = vi.fn().mockResolvedValue(mockResult);
    const routeHandler = createRouteHandler(handler, "test_operation");

    await routeHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(measureExecutionTime).toHaveBeenCalledWith(
      expect.any(Function),
      "test_operation"
    );
    expect(handler).toHaveBeenCalledWith(mockReq, mockRes);
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it("should handle errors and return error response", async () => {
    const { measureExecutionTime } = await import("../../utils");
    const { ErrorHandler } = await import("../../error-handler");

    const testError = new Error("Test error");
    vi.mocked(measureExecutionTime).mockRejectedValue(testError);

    const mockErrorResponse = {
      success: false,
      error: {
        message: "Test error",
        type: ErrorType.EXTERNAL_SERVICE_ERROR,
        code: undefined,
      },
      context: {},
      timestamp: "2024-01-01T00:00:00.000Z",
    };
    vi.mocked(ErrorHandler.handleRouteError).mockReturnValue(mockErrorResponse);

    const handler = vi.fn().mockRejectedValue(testError);
    const routeHandler = createRouteHandler(handler, "test_operation");

    await routeHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(ErrorHandler.handleRouteError).toHaveBeenCalledWith(
      testError,
      "test_operation",
      { duration: expect.any(Number) }
    );
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(mockErrorResponse);
  });

  it("should pass request and response to handler", async () => {
    const { measureExecutionTime } = await import("../../utils");
    const mockResult = { success: true };

    vi.mocked(measureExecutionTime).mockImplementation(async (fn) => {
      const result = await fn();
      return { result, duration: 50 };
    });

    const handler = vi.fn().mockResolvedValue(mockResult);
    const routeHandler = createRouteHandler(handler, "test_operation");

    await routeHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(handler).toHaveBeenCalledWith(mockReq, mockRes);
  });

  it("should handle async handler that throws", async () => {
    const { measureExecutionTime } = await import("../../utils");
    const { ErrorHandler } = await import("../../error-handler");

    const testError = new Error("Async error");
    vi.mocked(measureExecutionTime).mockRejectedValue(testError);

    const mockErrorResponse = {
      success: false,
      error: {
        message: "Async error",
        type: ErrorType.EXTERNAL_SERVICE_ERROR,
        code: undefined,
      },
      context: {},
      timestamp: "2024-01-01T00:00:00.000Z",
    };
    vi.mocked(ErrorHandler.handleRouteError).mockReturnValue(mockErrorResponse);

    const handler = vi.fn().mockImplementation(() => {
      throw testError;
    });
    const routeHandler = createRouteHandler(handler, "test_operation");

    await routeHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(ErrorHandler.handleRouteError).toHaveBeenCalledWith(
      testError,
      "test_operation",
      { duration: expect.any(Number) }
    );
  });

  it("should ignore next function parameter", async () => {
    const { measureExecutionTime } = await import("../../utils");
    const mockResult = { success: true };

    vi.mocked(measureExecutionTime).mockImplementation(async (fn) => {
      const result = await fn();
      return { result, duration: 25 };
    });

    const handler = vi.fn().mockResolvedValue(mockResult);
    const routeHandler = createRouteHandler(handler, "test_operation");

    await routeHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
  });
});
