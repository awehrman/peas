import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ServiceContainer } from "../../container";

describe("ServiceContainer Singleton Pattern", () => {
  beforeEach(() => {
    // Reset the singleton instance before each test
    ServiceContainer.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the same instance when getInstance is called multiple times", () => {
    const instance1 = ServiceContainer.getInstance();
    const instance2 = ServiceContainer.getInstance();
    expect(instance1).toBe(instance2);
  });

  it("should create a new instance when reset is called", () => {
    const instance1 = ServiceContainer.getInstance();
    ServiceContainer.reset();
    const instance2 = ServiceContainer.getInstance();
    expect(instance1).not.toBe(instance2);
  });

  it("should maintain singleton behavior across multiple getInstance calls", () => {
    const instances = [];
    for (let i = 0; i < 5; i++) {
      instances.push(ServiceContainer.getInstance());
    }

    const firstInstance = instances[0];
    instances.forEach((instance) => {
      expect(instance).toBe(firstInstance);
    });
  });

  it("should create fresh instance after reset", () => {
    const instance1 = ServiceContainer.getInstance();
    ServiceContainer.reset();
    const instance2 = ServiceContainer.getInstance();
    ServiceContainer.reset();
    const instance3 = ServiceContainer.getInstance();

    expect(instance1).not.toBe(instance2);
    expect(instance2).not.toBe(instance3);
    expect(instance1).not.toBe(instance3);
  });
});
