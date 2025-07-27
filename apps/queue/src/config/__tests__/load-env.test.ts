import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createConsoleSpies,
  createTestEnvironment,
} from "../../test-utils/helpers";

// Mocks
vi.mock("dotenv", () => ({ config: vi.fn() }));
vi.mock("find-up", () => ({ findUpSync: vi.fn() }));

const DUMMY_ENV_PATH = "/some/path/.env.local";

describe("load-env.ts", () => {
  let testEnv: ReturnType<typeof createTestEnvironment>;
  let consoleSpies: ReturnType<typeof createConsoleSpies>;

  beforeEach(() => {
    testEnv = createTestEnvironment();
    consoleSpies = createConsoleSpies();
    vi.resetModules();
  });

  afterEach(() => {
    testEnv.restore();
    consoleSpies.restore();
    vi.clearAllMocks();
  });

  it("loads .env.local when found and logs env vars", async () => {
    const { findUpSync } = await import("find-up");
    const { config } = await import("dotenv");
    vi.mocked(findUpSync).mockReturnValue(DUMMY_ENV_PATH);
    vi.mocked(config).mockImplementation(() => {
      process.env.NODE_ENV = "test";
      process.env.REDISHOST = "localhost";
      process.env.REDISPORT = "6379";
      process.env.REDISUSERNAME = "user";
      process.env.REDISPASSWORD = "pass";
      process.env.DATABASE_URL = "postgres://...";
      return { parsed: {} };
    });

    // Re-import to trigger auto-load
    await import("../load-env");

    expect(findUpSync).toHaveBeenCalledWith(".env.local", expect.any(Object));
    expect(config).toHaveBeenCalledWith({ path: DUMMY_ENV_PATH, quiet: true });
    expect(consoleSpies.logSpy).toHaveBeenCalledWith(
      `[env] Loading environment from: ${DUMMY_ENV_PATH}`
    );
    expect(consoleSpies.logSpy).toHaveBeenCalledWith(
      "[env] Environment variables loaded:",
      expect.objectContaining({
        NODE_ENV: "test",
        REDISHOST: "set",
        REDISPORT: "6379",
        REDISUSERNAME: "set",
        REDISPASSWORD: "set",
        DATABASE_URL: "set",
      })
    );
  });

  it("logs a warning if .env.local is not found", async () => {
    const { findUpSync } = await import("find-up");
    vi.mocked(findUpSync).mockReturnValue(undefined);

    await import("../load-env");

    expect(consoleSpies.warnSpy).toHaveBeenCalledWith(
      "[env] No .env.local file found in parent directories"
    );
  });

  it("logs an error if something throws", async () => {
    const { findUpSync } = await import("find-up");
    vi.mocked(findUpSync).mockImplementation(() => {
      throw new Error("find-up failed");
    });

    await import("../load-env");

    expect(consoleSpies.errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[env] Error loading environment variables:"),
      expect.any(Error)
    );
  });

  it("logs correct env var values (undefined/set)", async () => {
    const { findUpSync } = await import("find-up");
    const { config } = await import("dotenv");
    vi.mocked(findUpSync).mockReturnValue(DUMMY_ENV_PATH);
    vi.mocked(config).mockImplementation(() => {
      process.env.NODE_ENV = undefined;
      process.env.REDISHOST = undefined;
      process.env.REDISPORT = undefined;
      process.env.REDISUSERNAME = undefined;
      process.env.REDISPASSWORD = undefined;
      process.env.DATABASE_URL = undefined;
      return { parsed: {} };
    });

    await import("../load-env");

    expect(consoleSpies.logSpy).toHaveBeenCalledWith(
      "[env] Environment variables loaded:",
      expect.objectContaining({
        NODE_ENV: undefined,
        REDISHOST: "undefined",
        REDISPORT: undefined,
        REDISUSERNAME: "undefined",
        REDISPASSWORD: "undefined",
        DATABASE_URL: "undefined",
      })
    );
  });
});
