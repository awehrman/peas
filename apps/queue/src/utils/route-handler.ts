import { Request, Response, NextFunction } from "express";
import { ErrorHandler } from "./error-handler";
import { measureExecutionTime } from "./utils";
import { HTTP_CONSTANTS } from "../config/constants";
import { ErrorType, ErrorSeverity } from "../types";

/**
 * Route handler wrapper with error handling and timing
 */
export function createRouteHandler<T>(
  handler: (req: Request, res: Response) => Promise<T>,
  operationName: string
) {
  return async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { result } = await measureExecutionTime(
        () => handler(req, res),
        operationName
      );

      return result;
    } catch (error) {
      const errorResponse = ErrorHandler.handleRouteError(
        error,
        operationName,
        { duration: Date.now() }
      );

      res
        .status(HTTP_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json(errorResponse);
    }
  };
}

/**
 * Async route handler with automatic error handling
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/**
 * Create a route handler that returns JSON response
 */
export function createJsonHandler<T>(
  handler: (req: Request, res: Response) => Promise<T>,
  operationName: string
) {
  return async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { result, duration } = await measureExecutionTime(
        () => handler(req, res),
        operationName
      );

      res.json(
        ErrorHandler.createHttpSuccessResponse(result, undefined, { duration })
      );
    } catch (error) {
      const errorResponse = ErrorHandler.handleRouteError(
        error,
        operationName,
        { duration: Date.now() }
      );

      res
        .status(HTTP_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json(errorResponse);
    }
  };
}

/**
 * Create a route handler for queue operations
 */
export function createQueueHandler<T>(
  handler: (req: Request, res: Response) => Promise<T>,
  operationName: string
) {
  return async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { result, duration } = await measureExecutionTime(
        () => handler(req, res),
        operationName
      );

      res.json(
        ErrorHandler.createHttpSuccessResponse(result, undefined, { duration })
      );
    } catch (error) {
      const errorResponse = ErrorHandler.handleRouteError(
        error,
        operationName,
        { duration: Date.now() }
      );

      res
        .status(HTTP_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json(errorResponse);
    }
  };
}

/**
 * Validate required request parameters
 */
export function validateRequiredParams(
  req: Request,
  requiredParams: string[]
): void {
  const missingParams = requiredParams.filter(
    (param) => !req.params[param] && !req.query[param] && !req.body[param]
  );

  if (missingParams.length > 0) {
    throw new Error(`Missing required parameters: ${missingParams.join(", ")}`);
  }
}

/**
 * Validate request body schema
 */
export function validateRequestBody<T>(
  req: Request,
  validator: (body: unknown) => body is T
): T {
  if (!validator(req.body)) {
    throw new Error("Invalid request body");
  }
  return req.body;
}

/**
 * Create a middleware for request validation
 */
export function createValidationMiddleware(
  requiredParams: string[] = [],
  bodyValidator?: (body: unknown) => boolean
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (requiredParams.length > 0) {
        validateRequiredParams(req, requiredParams);
      }

      if (bodyValidator && req.body) {
        if (!bodyValidator(req.body)) {
          throw new Error("Invalid request body");
        }
      }

      next();
    } catch (error) {
      const errorResponse = ErrorHandler.handleRouteError(
        error,
        "request_validation"
      );

      res.status(HTTP_CONSTANTS.STATUS_CODES.BAD_REQUEST).json(errorResponse);
    }
  };
}

/**
 * Create a middleware for rate limiting
 */
export function createRateLimitMiddleware(
  maxRequests: number,
  windowMs: number
) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || "unknown";
    const now = Date.now();

    const clientRequests = requests.get(clientId);

    if (!clientRequests || now > clientRequests.resetTime) {
      requests.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (clientRequests.count >= maxRequests) {
      const errorResponse = ErrorHandler.createHttpErrorResponse(
        ErrorHandler.createJobError(
          "Rate limit exceeded",
          ErrorType.EXTERNAL_SERVICE_ERROR,
          ErrorSeverity.MEDIUM,
          { clientId, maxRequests, windowMs }
        )
      );

      return res
        .status(HTTP_CONSTANTS.STATUS_CODES.TOO_MANY_REQUESTS || 429)
        .json(errorResponse);
    }

    clientRequests.count++;
    next();
  };
}
