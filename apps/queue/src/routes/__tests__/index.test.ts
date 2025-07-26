import { describe, expect, it, vi } from "vitest";

// Mock all the router modules to avoid importing actual implementations
vi.mock("../import", () => ({
  importRouter: vi.fn(),
}));

vi.mock("../notes", () => ({
  notesRouter: vi.fn(),
}));

vi.mock("../health-enhanced", () => ({
  healthEnhancedRouter: vi.fn(),
}));

vi.mock("../metrics", () => ({
  metricsRouter: vi.fn(),
}));

vi.mock("../cache", () => ({
  cacheRouter: vi.fn(),
}));

vi.mock("../performance", () => ({
  performanceRouter: vi.fn(),
}));

describe("Routes Index", () => {
  it("should export all router modules", async () => {
    // Import the index module
    const routesIndex = await import("../index");

    // Verify all expected exports are present
    expect(routesIndex).toHaveProperty("importRouter");
    expect(routesIndex).toHaveProperty("notesRouter");
    expect(routesIndex).toHaveProperty("healthEnhancedRouter");
    expect(routesIndex).toHaveProperty("metricsRouter");
    expect(routesIndex).toHaveProperty("cacheRouter");
    expect(routesIndex).toHaveProperty("performanceRouter");
  });

  it("should export exactly 6 router modules", async () => {
    const routesIndex = await import("../index");

    // Count the number of exports
    const exportCount = Object.keys(routesIndex).length;
    expect(exportCount).toBe(6);
  });

  it("should export importRouter from import module", async () => {
    const { importRouter } = await import("../index");
    const { importRouter: originalImportRouter } = await import("../import");

    expect(importRouter).toBe(originalImportRouter);
  });

  it("should export notesRouter from notes module", async () => {
    const { notesRouter } = await import("../index");
    const { notesRouter: originalNotesRouter } = await import("../notes");

    expect(notesRouter).toBe(originalNotesRouter);
  });

  it("should export healthEnhancedRouter from health-enhanced module", async () => {
    const { healthEnhancedRouter } = await import("../index");
    const { healthEnhancedRouter: originalHealthEnhancedRouter } = await import(
      "../health-enhanced"
    );

    expect(healthEnhancedRouter).toBe(originalHealthEnhancedRouter);
  });

  it("should export metricsRouter from metrics module", async () => {
    const { metricsRouter } = await import("../index");
    const { metricsRouter: originalMetricsRouter } = await import("../metrics");

    expect(metricsRouter).toBe(originalMetricsRouter);
  });

  it("should export cacheRouter from cache module", async () => {
    const { cacheRouter } = await import("../index");
    const { cacheRouter: originalCacheRouter } = await import("../cache");

    expect(cacheRouter).toBe(originalCacheRouter);
  });

  it("should export performanceRouter from performance module", async () => {
    const { performanceRouter } = await import("../index");
    const { performanceRouter: originalPerformanceRouter } = await import(
      "../performance"
    );

    expect(performanceRouter).toBe(originalPerformanceRouter);
  });

  it("should not export any unexpected properties", async () => {
    const routesIndex = await import("../index");

    // Get all property names
    const propertyNames = Object.keys(routesIndex);

    // Define expected property names
    const expectedProperties = [
      "importRouter",
      "notesRouter",
      "healthEnhancedRouter",
      "metricsRouter",
      "cacheRouter",
      "performanceRouter",
    ];

    // Verify all properties are expected
    propertyNames.forEach((property) => {
      expect(expectedProperties).toContain(property);
    });
  });

  it("should have all exports as functions (router objects)", async () => {
    const routesIndex = await import("../index");

    // Verify all exports are functions (Express routers)
    Object.values(routesIndex).forEach((exportValue) => {
      expect(typeof exportValue).toBe("function");
    });
  });
});
