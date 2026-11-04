import { createHmac } from "crypto";
import type { NextFunction, Request, Response } from "express";
import type { IncomingMessage } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpStatus } from "../../types";
import {
  createBasicAuthMiddleware,
  getQueueAuthSecret,
  isAuthorizedWebSocketRequest,
  requireQueueAuth,
  verifyQueueToken,
} from "../auth";

const SECRET = "test-secret-that-is-at-least-32-chars";
const NOW = Date.UTC(2026, 0, 1);

function signToken(
  payload: Record<string, unknown>,
  secret: string = SECRET
): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );
  const signature = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function validToken(): string {
  return signToken({ sub: "user-1", exp: NOW / 1000 + 300 });
}

function createRequest(headers: Record<string, string> = {}): Request {
  return {
    get: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}

function createResponse() {
  const res = {
    locals: {} as Record<string, unknown>,
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
    set: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.send.mockReturnValue(res);
  res.set.mockReturnValue(res);
  return res;
}

describe("auth.ts", () => {
  let next: NextFunction;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.stubEnv("QUEUE_AUTH_SECRET", SECRET);
    next = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  describe("getQueueAuthSecret", () => {
    it("returns the configured secret", () => {
      expect(getQueueAuthSecret()).toBe(SECRET);
    });

    it("throws when the secret is missing", () => {
      vi.stubEnv("QUEUE_AUTH_SECRET", "");
      expect(() => getQueueAuthSecret()).toThrow(/QUEUE_AUTH_SECRET/);
    });

    it("throws when the secret is too short to be safe", () => {
      vi.stubEnv("QUEUE_AUTH_SECRET", "short");
      expect(() => getQueueAuthSecret()).toThrow(/at least 32/);
    });
  });

  describe("verifyQueueToken", () => {
    it("returns the payload for a valid token", () => {
      expect(verifyQueueToken(validToken(), SECRET)).toEqual({
        sub: "user-1",
        exp: NOW / 1000 + 300,
      });
    });

    it("rejects an expired token", () => {
      const token = signToken({ sub: "user-1", exp: NOW / 1000 - 1 });
      expect(verifyQueueToken(token, SECRET)).toBeNull();
    });

    it("rejects a token signed with a different secret", () => {
      const token = signToken(
        { sub: "user-1", exp: NOW / 1000 + 300 },
        "another-secret-that-is-32-chars-long"
      );
      expect(verifyQueueToken(token, SECRET)).toBeNull();
    });

    it("rejects a token whose payload was tampered with", () => {
      const [, signature] = validToken().split(".");
      const forgedPayload = Buffer.from(
        JSON.stringify({ sub: "admin", exp: NOW / 1000 + 300 })
      ).toString("base64url");
      expect(
        verifyQueueToken(`${forgedPayload}.${signature}`, SECRET)
      ).toBeNull();
    });

    it("rejects malformed tokens", () => {
      expect(verifyQueueToken("", SECRET)).toBeNull();
      expect(verifyQueueToken("only-one-part", SECRET)).toBeNull();
      expect(verifyQueueToken("a.b.c", SECRET)).toBeNull();
    });

    it("rejects a correctly signed payload with the wrong shape", () => {
      const token = signToken({ user: "user-1" });
      expect(verifyQueueToken(token, SECRET)).toBeNull();
    });
  });

  describe("requireQueueAuth", () => {
    it("calls next and records the user for a valid bearer token", () => {
      const res = createResponse();

      requireQueueAuth(
        createRequest({ authorization: `Bearer ${validToken()}` }),
        res as unknown as Response,
        next
      );

      expect(next).toHaveBeenCalledOnce();
      expect(res.locals.userId).toBe("user-1");
    });

    it("responds 401 when the Authorization header is missing", () => {
      const res = createResponse();

      requireQueueAuth(createRequest(), res as unknown as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });

    it("responds 401 for an invalid token", () => {
      const res = createResponse();

      requireQueueAuth(
        createRequest({ authorization: "Bearer not.valid" }),
        res as unknown as Response,
        next
      );

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });
  });

  describe("isAuthorizedWebSocketRequest", () => {
    it("accepts a handshake with a valid token query parameter", () => {
      const req = { url: `/?token=${validToken()}` } as IncomingMessage;
      expect(isAuthorizedWebSocketRequest(req)).toBe(true);
    });

    it("rejects a handshake without a token", () => {
      expect(
        isAuthorizedWebSocketRequest({ url: "/" } as IncomingMessage)
      ).toBe(false);
    });
  });

  describe("createBasicAuthMiddleware", () => {
    const middleware = createBasicAuthMiddleware("admin", "hunter2", "Test");

    function basic(credentials: string): string {
      return `Basic ${Buffer.from(credentials).toString("base64")}`;
    }

    it("calls next for matching credentials", () => {
      const res = createResponse();

      middleware(
        createRequest({ authorization: basic("admin:hunter2") }),
        res as unknown as Response,
        next
      );

      expect(next).toHaveBeenCalledOnce();
    });

    it("challenges the browser when credentials are missing", () => {
      const res = createResponse();

      middleware(createRequest(), res as unknown as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.set).toHaveBeenCalledWith(
        "WWW-Authenticate",
        'Basic realm="Test"'
      );
      expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });

    it("rejects a wrong password", () => {
      const res = createResponse();

      middleware(
        createRequest({ authorization: basic("admin:wrong") }),
        res as unknown as Response,
        next
      );

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });
  });
});
