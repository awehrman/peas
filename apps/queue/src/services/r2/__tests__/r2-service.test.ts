import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { R2Service } from "../r2-service";

describe("R2Service", () => {
  let r2Service: R2Service;
  const mockConfig = {
    accountId: "test-account",
    accessKeyId: "test-access-key",
    secretAccessKey: "test-secret-key",
    bucketName: "test-bucket",
    publicUrl: "https://example.com",
  };

  beforeEach(() => {
    r2Service = new R2Service(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("isConfigured", () => {
    it("should return true when all required environment variables are set", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        R2_ACCOUNT_ID: "test-account",
        R2_ACCESS_KEY_ID: "test-access-key",
        R2_SECRET_ACCESS_KEY: "test-secret-key",
        R2_BUCKET_NAME: "test-bucket",
      };

      expect(R2Service.isConfigured()).toBe(true);
      process.env = originalEnv;
    });

    it("should return false when any required environment variable is missing", () => {
      const originalEnv = process.env;
      // Clear all R2 environment variables first
      process.env = {
        ...originalEnv,
        R2_ACCOUNT_ID: "test-account",
        R2_ACCESS_KEY_ID: "test-access-key",
        R2_SECRET_ACCESS_KEY: undefined,
        R2_BUCKET_NAME: undefined,
        R2_PUBLIC_URL: undefined,
      };

      expect(R2Service.isConfigured()).toBe(false);
      process.env = originalEnv;
    });
  });

  describe("fromEnvironment", () => {
    it("should create R2Service instance when properly configured", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        R2_ACCOUNT_ID: "test-account",
        R2_ACCESS_KEY_ID: "test-access-key",
        R2_SECRET_ACCESS_KEY: "test-secret-key",
        R2_BUCKET_NAME: "test-bucket",
        R2_PUBLIC_URL: "https://example.com",
      };

      const service = R2Service.fromEnvironment();
      expect(service).toBeInstanceOf(R2Service);
      process.env = originalEnv;
    });

    it("should return null when not properly configured", () => {
      const originalEnv = process.env;
      // Clear all R2 environment variables
      process.env = {
        ...originalEnv,
        R2_ACCOUNT_ID: undefined,
        R2_ACCESS_KEY_ID: undefined,
        R2_SECRET_ACCESS_KEY: undefined,
        R2_BUCKET_NAME: undefined,
        R2_PUBLIC_URL: undefined,
      };

      const service = R2Service.fromEnvironment();
      expect(service).toBeNull();
      process.env = originalEnv;
    });
  });

  describe("constructor", () => {
    it("should create R2Service with valid config", () => {
      expect(r2Service).toBeInstanceOf(R2Service);
    });
  });
});
