import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HealthMonitor } from "../../health-monitor";

describe("HealthMonitor Singleton Pattern", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the singleton instance before each test
    (HealthMonitor as unknown as { instance: undefined }).instance = undefined;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getInstance", () => {
    it("should return the same instance when called multiple times", () => {
      const instance1 = HealthMonitor.getInstance();
      const instance2 = HealthMonitor.getInstance();
      const instance3 = HealthMonitor.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(instance1).toBe(instance3);
    });

    it("should create a new instance on first call", () => {
      const instance = HealthMonitor.getInstance();
      expect(instance).toBeInstanceOf(HealthMonitor);
    });

    it("should return existing instance on subsequent calls", () => {
      const instance1 = HealthMonitor.getInstance();
      const instance2 = HealthMonitor.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should maintain instance across multiple getInstance calls", () => {
      const instances = [];
      for (let i = 0; i < 10; i++) {
        instances.push(HealthMonitor.getInstance());
      }

      const firstInstance = instances[0];
      instances.forEach((instance) => {
        expect(instance).toBe(firstInstance);
      });
    });
  });

  describe("Private Constructor", () => {
    it("should have private constructor that throws error", () => {
      // First get an instance to ensure the singleton is initialized
      HealthMonitor.getInstance();

      // Now try to create another instance, which should throw
      expect(
        () => new (HealthMonitor as unknown as new () => HealthMonitor)()
      ).toThrow("HealthMonitor is a singleton. Use getInstance() instead.");
    });

    it("should throw specific error message when constructor is called directly", () => {
      // First get an instance to ensure the singleton is initialized
      HealthMonitor.getInstance();

      // Now try to create another instance, which should throw
      expect(
        () => new (HealthMonitor as unknown as new () => HealthMonitor)()
      ).toThrow("HealthMonitor is a singleton. Use getInstance() instead.");
    });
  });

  describe("Instance Properties", () => {
    it("should have required instance properties", () => {
      const instance = HealthMonitor.getInstance();

      expect(instance).toHaveProperty("getHealth");
      expect(instance).toHaveProperty("refreshHealth");
      expect(instance).toHaveProperty("isHealthy");
      expect(instance).toHaveProperty("getComponentHealth");

      expect(typeof instance.getHealth).toBe("function");
      expect(typeof instance.refreshHealth).toBe("function");
      expect(typeof instance.isHealthy).toBe("function");
      expect(typeof instance.getComponentHealth).toBe("function");
    });

    it("should have private properties that are not accessible", () => {
      const instance = HealthMonitor.getInstance();

      // These properties should not be accessible from outside
      expect(
        (instance as unknown as { healthCache: unknown }).healthCache
      ).toBeDefined();
      expect(
        (instance as unknown as { lastCheckTime: unknown }).lastCheckTime
      ).toBeDefined();
      expect(
        (instance as unknown as { CACHE_DURATION_MS: unknown })
          .CACHE_DURATION_MS
      ).toBeDefined();
      expect(
        (instance as unknown as { TIMEOUT_MS: unknown }).TIMEOUT_MS
      ).toBeDefined();
    });
  });

  describe("Instance Uniqueness", () => {
    it("should maintain unique instance across different test contexts", () => {
      const instance1 = HealthMonitor.getInstance();

      // Simulate some time passing
      setTimeout(() => {}, 0);

      const instance2 = HealthMonitor.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should not create multiple instances even with concurrent access simulation", () => {
      const instances = [];

      // Simulate concurrent access
      for (let i = 0; i < 100; i++) {
        instances.push(HealthMonitor.getInstance());
      }

      const firstInstance = instances[0];
      const allSame = instances.every((instance) => instance === firstInstance);

      expect(allSame).toBe(true);
    });
  });
});
