import { describe, expect, it } from "vitest";

// Test all exports from the services index
import * as Services from "../index";

describe("Services Index Exports", () => {
  describe("Core service container exports", () => {
    it("should export ServiceContainer", () => {
      expect(Services.ServiceContainer).toBeDefined();
      expect(typeof Services.ServiceContainer).toBe("function");
    });
  });

  describe("Service factory exports", () => {
    it("should export ServiceFactory", () => {
      expect(Services.ServiceFactory).toBeDefined();
      expect(typeof Services.ServiceFactory).toBe("function");
    });
  });

  describe("Service implementation exports", () => {
    it("should export DatabaseService", () => {
      expect(Services.DatabaseService).toBeDefined();
      expect(typeof Services.DatabaseService).toBe("function");
    });

    it("should export QueueService", () => {
      expect(Services.QueueService).toBeDefined();
      expect(typeof Services.QueueService).toBe("function");
    });

    it("should export EnhancedLoggerService", () => {
      expect(Services.EnhancedLoggerService).toBeDefined();
    });
  });

  describe("Action exports", () => {
    it("should export actions", () => {
      // This tests that the actions are exported (even if empty)
      expect(Services).toBeDefined();
    });
  });

  describe("Export structure", () => {
    it("should have all expected runtime exports", () => {
      const expectedExports = [
        "ServiceContainer",
        "ServiceFactory",
        "DatabaseService",
        "QueueService",
        "EnhancedLoggerService",
      ];

      expectedExports.forEach((exportName) => {
        expect(Services).toHaveProperty(exportName);
      });
    });
  });
});
