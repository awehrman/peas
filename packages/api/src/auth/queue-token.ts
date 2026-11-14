import { createHmac } from "node:crypto";

const QUEUE_TOKEN_TTL_SECONDS = 60 * 5;
const MIN_SECRET_LENGTH = 32;

/**
 * Creates a short-lived token the browser sends to the queue service.
 * Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature).
 * The queue verifies it with the same QUEUE_AUTH_SECRET (apps/queue/src/middleware/auth.ts).
 */
export function createQueueToken(userId: string, now = Date.now()): string {
  const secret = process.env.QUEUE_AUTH_SECRET;

  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `QUEUE_AUTH_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters`
    );
  }

  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      exp: Math.floor(now / 1000) + QUEUE_TOKEN_TTL_SECONDS,
    })
  ).toString("base64url");

  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}
