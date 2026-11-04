import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";
import type { IncomingMessage } from "http";
import { URL } from "url";

import { HttpStatus } from "../types";

const MIN_SECRET_LENGTH = 32;

export interface QueueTokenPayload {
  /** Id of the web app user the token was issued to */
  sub: string;
  /** Expiry as a unix timestamp in seconds */
  exp: number;
}

// ============================================================================
// QUEUE TOKENS
// ============================================================================

/**
 * Reads the secret shared with the web app, which signs tokens in
 * apps/web/src/lib/auth/utils/queue-token.ts.
 */
export function getQueueAuthSecret(): string {
  const secret = process.env.QUEUE_AUTH_SECRET;

  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `QUEUE_AUTH_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters`
    );
  }

  return secret;
}

export function verifyQueueToken(
  token: string,
  secret: string,
  now: number = Date.now()
): QueueTokenPayload | null {
  const [payload, signature, ...rest] = token.split(".");

  if (!payload || !signature || rest.length > 0) {
    return null;
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest();
  const providedSignature = Buffer.from(signature, "base64url");

  if (
    providedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return null;
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!isQueueTokenPayload(decoded) || decoded.exp * 1000 <= now) {
    return null;
  }

  return decoded;
}

function isQueueTokenPayload(value: unknown): value is QueueTokenPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const { sub, exp } = value as Record<string, unknown>;
  return typeof sub === "string" && sub !== "" && typeof exp === "number";
}

function getBearerToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export function requireQueueAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = getBearerToken(req.get("Authorization"));
  const payload = token ? verifyQueueToken(token, getQueueAuthSecret()) : null;

  if (!payload) {
    res.status(HttpStatus.UNAUTHORIZED).json({ error: "Unauthorized" });
    return;
  }

  res.locals.userId = payload.sub;
  next();
}

/**
 * Browsers can't set headers on WebSocket handshakes, so the token
 * arrives as a `token` query parameter instead.
 */
export function isAuthorizedWebSocketRequest(req: IncomingMessage): boolean {
  const token = new URL(req.url ?? "/", "http://localhost").searchParams.get(
    "token"
  );

  return (
    token !== null && verifyQueueToken(token, getQueueAuthSecret()) !== null
  );
}

// ============================================================================
// BULL BOARD BASIC AUTH
// ============================================================================

function safeEqual(a: string, b: string): boolean {
  // Hashing first gives equal-length buffers, which timingSafeEqual requires
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function createBasicAuthMiddleware(
  username: string,
  password: string,
  realm: string
) {
  return function basicAuthMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const authorization = req.get("Authorization");

    if (authorization?.startsWith("Basic ")) {
      const decoded = Buffer.from(
        authorization.slice("Basic ".length),
        "base64"
      ).toString("utf8");
      const separatorIndex = decoded.indexOf(":");

      if (separatorIndex !== -1) {
        const isUsernameValid = safeEqual(
          decoded.slice(0, separatorIndex),
          username
        );
        const isPasswordValid = safeEqual(
          decoded.slice(separatorIndex + 1),
          password
        );

        if (isUsernameValid && isPasswordValid) {
          next();
          return;
        }
      }
    }

    res.set("WWW-Authenticate", `Basic realm="${realm}"`);
    res.status(HttpStatus.UNAUTHORIZED).send("Authentication required");
  };
}
