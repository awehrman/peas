import { describe, it, expect, vi, beforeEach } from "vitest";
import { asyncHandler } from "../../route-handler";
import type { Request, Response, NextFunction } from "express";

describe("asyncHandler", () => {
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

  it("should execute async handler successfully", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const wrappedHandler = asyncHandler(handler);

    await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should call next with error when handler throws", async () => {
    const testError = new Error("Test error");
    const handler = vi.fn().mockRejectedValue(testError);
    const wrappedHandler = asyncHandler(handler);

    await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(testError);
  });

  it("should handle handler that returns void", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const wrappedHandler = asyncHandler(handler);

    await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should handle handler that returns a value", async () => {
    const handler = vi.fn().mockResolvedValue("some value");
    const wrappedHandler = asyncHandler(handler);

    await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
