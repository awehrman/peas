import type { NextFunction, Request, Response } from "express";

// Extended request type for validated query parameters
interface ValidatedQueryRequest extends Request {
  validatedQuery?: {
    page: number;
    limit: number;
    // Add other validated query params as needed
  };
}

// Type guard to check if request has validated query
function hasValidatedQuery(req: Request): req is ValidatedQueryRequest {
  return 'validatedQuery' in req && req.validatedQuery !== undefined;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

export function createRateLimitMiddleware(
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100
) {
  return function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const key = req.ip || "unknown";
    const now = Date.now();

    if (!rateLimitStore[key] || now > rateLimitStore[key]!.resetTime) {
      rateLimitStore[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else {
      rateLimitStore[key]!.count++;
    }

    const { count, resetTime } = rateLimitStore[key]!;

    // Set rate limit headers
    res.set({
      "X-RateLimit-Limit": maxRequests.toString(),
      "X-RateLimit-Remaining": Math.max(0, maxRequests - count).toString(),
      "X-RateLimit-Reset": new Date(resetTime).toISOString(),
    });

    if (count > maxRequests) {
      return res.status(429).json({
        error: "Too many requests",
        message: `Rate limit exceeded. Try again after ${new Date(resetTime).toISOString()}`,
        retryAfter: Math.ceil((resetTime - now) / 1000),
      });
    }

    next();
  };
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

export function validateUUID(req: Request, res: Response, next: NextFunction) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (req.params.id && !uuidRegex.test(req.params.id)) {
    return res.status(400).json({
      error: "Invalid ID format",
      message: "ID must be a valid UUID",
    });
  }

  next();
}

export function validatePagination(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  if (page < 1) {
    return res.status(400).json({
      error: "Invalid page number",
      message: "Page must be greater than 0",
    });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      error: "Invalid limit",
      message: "Limit must be between 1 and 100",
    });
  }

  // Add validated values to request using type assertion
  if (!hasValidatedQuery(req)) {
    (req as ValidatedQueryRequest).validatedQuery = { page, limit };
  } else {
    req.validatedQuery = { page, limit };
  }
  next();
}

export function validateContent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const content = req.body?.content;

  if (!content || typeof content !== "string") {
    return res.status(400).json({
      error: "Invalid content",
      message: "Content is required and must be a string",
    });
  }

  if (content.length === 0) {
    return res.status(400).json({
      error: "Empty content",
      message: "Content cannot be empty",
    });
  }

  if (content.length > 10 * 1024 * 1024) {
    // 10MB
    return res.status(400).json({
      error: "Content too large",
      message: "Content size exceeds 10MB limit",
    });
  }

  next();
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

export function addSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Basic security headers
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  });

  next();
}

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

export function configureCORS(
  allowedOrigins: string[] = ["http://localhost:3000"]
) {
  return function corsMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
    }

    res.set({
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Allow-Credentials": "true",
    });

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    next();
  };
}

// ============================================================================
// REQUEST SIZE LIMITS
// ============================================================================

export function validateRequestSize(maxSizeBytes: number = 10 * 1024 * 1024) {
  return function requestSizeMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const contentLength = parseInt(req.headers["content-length"] || "0");

    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        error: "Request too large",
        message: `Request size exceeds ${Math.round(maxSizeBytes / 1024 / 1024)}MB limit`,
      });
    }

    next();
  };
}

// ============================================================================
// EXPORT ALL MIDDLEWARE
// ============================================================================

export const SecurityMiddleware = {
  rateLimit: createRateLimitMiddleware,
  validateUUID,
  validatePagination,
  validateContent,
  addSecurityHeaders,
  configureCORS,
  validateRequestSize,
} as const;
