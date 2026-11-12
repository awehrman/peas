import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@peas/database", () => ({
  prisma: {},
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}));

const { readCookie } = await import("../auth/session-cookie.js");
const { getSignUpCodes, validateSignUpCode } =
  await import("../auth/sign-up-codes.js");
const { createQueueToken } = await import("../auth/queue-token.js");
const { hashToken, generateRandomToken } = await import("../auth/crypto.js");

describe("readCookie", () => {
  it("finds one cookie in a header and decodes it", () => {
    expect(
      readCookie("theme=dark; session=abc%20def; other=1", "session")
    ).toBe("abc def");
    expect(readCookie("theme=dark", "session")).toBeNull();
    expect(readCookie(null, "session")).toBeNull();
  });
});

describe("sign-up codes", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts comma lists and JSON with limits", () => {
    vi.stubEnv("SIGN_UP_CODES", "alpha, beta");
    expect(getSignUpCodes().map((code) => code.code)).toEqual([
      "alpha",
      "beta",
    ]);

    vi.stubEnv(
      "SIGN_UP_CODES",
      JSON.stringify([{ code: "gamma", maxUses: 1, usedCount: 1 }])
    );
    expect(validateSignUpCode("gamma", getSignUpCodes())).toEqual({
      isValid: false,
      error: "Sign-up code has reached maximum uses",
    });
    expect(validateSignUpCode(undefined, getSignUpCodes()).isValid).toBe(false);
  });
});

describe("tokens", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("hashes session tokens deterministically", () => {
    const token = generateRandomToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("signs queue tokens the queue can verify", () => {
    const secret = "x".repeat(32);
    vi.stubEnv("QUEUE_AUTH_SECRET", secret);
    const token = createQueueToken("u1", 1_700_000_000_000);
    const [payload, signature] = token.split(".");
    expect(JSON.parse(Buffer.from(payload!, "base64url").toString())).toEqual({
      sub: "u1",
      exp: 1_700_000_300,
    });
    expect(signature).toBe(
      createHmac("sha256", secret).update(payload!).digest("base64url")
    );
  });

  it("refuses to sign without a long enough secret", () => {
    vi.stubEnv("QUEUE_AUTH_SECRET", "short");
    expect(() => createQueueToken("u1")).toThrow(/QUEUE_AUTH_SECRET/);
  });
});
